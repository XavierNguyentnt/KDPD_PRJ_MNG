import { google } from 'googleapis';
import { SHEET_CONFIG } from '@shared/schema';
import { Task } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export interface GoogleSheetsService {
  readTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  findTaskRow(id: string): Promise<number | null>;
}

/**
 * Google Sheets Service using Google Sheets API
 * Supports both authenticated (service account) and public read-only modes
 */
export class GoogleSheetsAPIService implements GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;
  private sheetName: string = 'Sheet1'; // Default sheet name
  private range: string = 'Sheet1!A:Z'; // Adjust based on your sheet structure
  private headerRow: number = 1;
  private dataStartRow: number = 2;

  constructor() {
    this.spreadsheetId = SHEET_CONFIG.sheetId;
    this.sheetName = this.detectSheetName();
    this.range = `${this.sheetName}!A:Z`;
    this.initializeAuth();
  }

  private detectSheetName(): string {
    // Try to detect sheet name from gid if provided
    // For now, default to Sheet1, but can be configured via env
    return process.env.GOOGLE_SHEET_NAME || 'Sheet1';
  }

  private initializeAuth() {
    let credentials: any = null;

    // Try to get credentials from environment variable first
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (credentialsJson) {
      try {
        credentials = JSON.parse(credentialsJson);
        console.log('Google Sheets API: Using credentials from GOOGLE_SERVICE_ACCOUNT_JSON');
      } catch (error) {
        console.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', error);
      }
    }

    // If no env var, try to read from JSON file (for development)
    if (!credentials) {
      try {
        // Look for common credential file names
        const possibleFiles = [
          'credentials.json',
          'service-account.json',
          'google-credentials.json',
          'zeta-courage-485612-h8-19dc8bb278ad.json', // Your specific file
        ];

        // First, try exact filenames
        const cwd = process.cwd();
        console.log(`Searching for credentials in: ${cwd}`);
        
        for (const filename of possibleFiles) {
          const filePath = path.join(cwd, filename);
          console.log(`Checking: ${filePath}`);
          if (fs.existsSync(filePath)) {
            console.log(`Found file: ${filePath}`);
            try {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              const parsed = JSON.parse(fileContent);
              // Verify it's a service account file
              if (parsed.type === 'service_account' && parsed.client_email) {
                credentials = parsed;
                console.log(`Google Sheets API: Using credentials from ${filename}`);
                break;
              } else {
                console.warn(`File ${filename} is not a valid service account file`);
              }
            } catch (parseError: any) {
              console.warn(`Failed to parse ${filename}:`, parseError.message);
            }
          }
        }

        // If still not found, search for any JSON file that looks like service account
        if (!credentials) {
          try {
            const files = fs.readdirSync(process.cwd());
            for (const file of files) {
              if (file.endsWith('.json') && 
                  file !== 'package.json' && 
                  file !== 'package-lock.json' &&
                  file !== 'tsconfig.json' &&
                  file !== 'components.json') {
                const filePath = path.join(process.cwd(), file);
                try {
                  const fileContent = fs.readFileSync(filePath, 'utf8');
                  const parsed = JSON.parse(fileContent);
                  if (parsed.type === 'service_account' && parsed.client_email) {
                    credentials = parsed;
                    console.log(`Google Sheets API: Using credentials from ${file}`);
                    break;
                  }
                } catch (e) {
                  // Not a valid service account file, continue
                }
              }
            }
          } catch (dirError: any) {
            console.warn('Could not read directory:', dirError.message);
          }
        }
      } catch (error: any) {
        console.warn('Error searching for credentials file:', error.message);
      }
    }

    if (credentials) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheets = google.sheets({ version: 'v4', auth });
        console.log('Google Sheets API: Service account authentication configured successfully');
      } catch (error) {
        console.warn('Failed to initialize Google Auth, falling back to read-only mode:', error);
        this.sheets = null;
      }
    } else {
      // Read-only mode using public access
      console.log('Google Sheets API: Using read-only public access (no write capabilities)');
      console.log('To enable write operations, set GOOGLE_SERVICE_ACCOUNT_JSON or place credentials.json in project root');
      this.sheets = null;
    }
  }

  /**
   * Read tasks from Google Sheets
   * Falls back to CSV export if API is not available
   */
  async readTasks(): Promise<Task[]> {
    if (this.sheets) {
      return this.readTasksViaAPI();
    } else {
      return this.readTasksViaCSV();
    }
  }

  private async readTasksViaAPI(): Promise<Task[]> {
    try {
      // First, get all sheets to find the one with task data
      const metadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const allSheets = metadata.data.sheets || [];
      
      if (allSheets.length === 0) {
        throw new Error('No sheets found in spreadsheet');
      }

      // List all available sheets
      console.log('Available sheets:');
      allSheets.forEach((s: any, idx: number) => {
        console.log(`  ${idx + 1}. "${s.properties.title}" (ID: ${s.properties.sheetId})`);
      });

      // Priority order for finding data sheet (data sheets first, reports last)
      const dataSheetNames = [
        'DỮ LIỆU CHUNG',
        'CV chung',
        'CV',
        'Tasks',
        'Data',
        'Dữ liệu',
        'Công việc',
      ];

      const reportSheetNames = [
        'BÁO CÁO CHUNG CV-BTK',
        'BÁO CÁO',
        'REPORT',
      ];

      // Try to find data sheet first
      let targetSheet = null;
      
      // 1. Try by gid if specified
      if (SHEET_CONFIG.gid) {
        targetSheet = allSheets.find((s: any) => String(s.properties.sheetId) === String(SHEET_CONFIG.gid));
        if (targetSheet) {
          console.log(`Using sheet from gid: "${targetSheet.properties.title}"`);
        }
      }

      // 2. Try to find data sheet by name
      if (!targetSheet) {
        for (const name of dataSheetNames) {
          targetSheet = allSheets.find((s: any) => 
            s.properties.title.toLowerCase().includes(name.toLowerCase())
          );
          if (targetSheet) {
            console.log(`Found data sheet: "${targetSheet.properties.title}"`);
            break;
          }
        }
      }

      // 3. If not found, try to find any sheet that's not a report
      if (!targetSheet) {
        targetSheet = allSheets.find((s: any) => {
          const title = s.properties.title.toLowerCase();
          return !reportSheetNames.some(report => title.includes(report.toLowerCase()));
        });
        if (targetSheet) {
          console.log(`Using non-report sheet: "${targetSheet.properties.title}"`);
        }
      }

      // 4. Fallback to first sheet
      if (!targetSheet) {
        targetSheet = allSheets[0];
        console.log(`Using first sheet: "${targetSheet.properties.title}"`);
      }

      this.sheetName = targetSheet.properties.title;
      this.range = `${this.sheetName}!A:Z`;
      console.log(`Reading from sheet: "${this.sheetName}"`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.warn('No data found in Google Sheet');
        return [];
      }

      // Find header row - look for common task-related headers
      let headerRowIndex = -1;
      const taskHeaderKeywords = ['task', 'công việc', 'cv', 'id', 'mã', 'tên', 'title', 'status', 'trạng thái', 'assignee', 'người thực hiện'];
      
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i] || [];
        const rowText = row.map((c: any) => String(c || '').toLowerCase()).join(' ');
        const hasTaskHeaders = taskHeaderKeywords.some(keyword => rowText.includes(keyword));
        
        if (hasTaskHeaders && row.filter((c: any) => c && String(c).trim()).length >= 3) {
          headerRowIndex = i;
          console.log(`Found header row at line ${i + 1}: ${row.slice(0, 5).join(', ')}...`);
          break;
        }
      }

      if (headerRowIndex === -1) {
        // Default to first row
        headerRowIndex = 0;
        console.log('Using first row as headers');
      }

      const headers = rows[headerRowIndex].map((h: string) => h?.trim() || '');
      if (headers.length === 0 || headers.every((h: string) => !h)) {
        console.warn('No valid headers found in Google Sheet');
        return [];
      }

      console.log(`Headers found: ${headers.slice(0, 10).join(', ')}...`);

      const tasks: Task[] = [];

      // Process data rows (start after header row)
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Skip completely empty rows
        if (row.every((cell: any) => !cell || String(cell).trim() === '')) continue;

        // Skip rows that look like section headers or summaries
        const firstCell = String(row[0] || '').trim();
        if (firstCell.match(/^(CÔNG VIỆC|BÁO CÁO|THÁNG|TỔNG|TỈ|SỐ)/i)) {
          continue;
        }

        const task = this.parseRowToTask(headers, row, i);
        if (task) {
          tasks.push(task);
        }
      }

      console.log(`Successfully parsed ${tasks.length} tasks from Google Sheets API`);
      return tasks;
    } catch (error: any) {
      console.error('Error reading from Google Sheets API:', error.message || error);
      // Fallback to CSV
      console.log('Falling back to CSV export...');
      return this.readTasksViaCSV();
    }
  }

  private async readTasksViaCSV(): Promise<Task[]> {
    // Try multiple URL formats for CSV export
    const urls = [
      // Format 1: With gid parameter
      `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=${SHEET_CONFIG.gid || '0'}`,
      // Format 2: Without gid (first sheet)
      `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv`,
      // Format 3: Alternative format
      `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${SHEET_CONFIG.gid || '0'}`,
      // Format 4: Alternative without gid
      `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv`,
    ];
    
    for (const url of urls) {
      try {
        console.log(`Trying CSV export URL: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.warn(`Failed with status ${response.status}: ${errorText.substring(0, 200)}`);
          continue; // Try next URL
        }

        const csvText = await response.text();
        
        // Check if we got HTML instead of CSV (common when sheet is not public)
        if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
          console.warn('Received HTML instead of CSV - sheet may not be publicly accessible');
          continue; // Try next URL
        }
        
        const { parse } = await import('csv-parse/sync');
        
        const records = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });

        if (records.length === 0) {
          console.warn('No records found in CSV');
          continue; // Try next URL
        }

        const tasks: Task[] = [];
        records.forEach((record: any, index: number) => {
          const task = this.parseRecordToTask(record, index);
          if (task) {
            tasks.push(task);
          }
        });

        if (tasks.length > 0) {
          console.log(`Successfully parsed ${tasks.length} tasks from CSV export using URL format`);
          return tasks;
        }
      } catch (error: any) {
        console.warn(`Error with URL ${url}:`, error.message);
        continue; // Try next URL
      }
    }
    
    // If all URLs failed, return empty array
    console.error('All CSV export URLs failed. Please ensure:');
    console.error('1. The Google Sheet is set to "Anyone with the link can view"');
    console.error('2. The sheet ID is correct:', this.spreadsheetId);
    console.error('3. Or configure GOOGLE_SERVICE_ACCOUNT_JSON for API access');
    return [];
  }

  /**
   * Parse a CSV record to Task
   * Handles Vietnamese column names and various formats
   */
  private parseRecordToTask(record: any, index: number): Task | null {
    const getVal = (keys: string[]) => {
      for (const key of keys) {
        const foundKey = Object.keys(record).find(
          (k) => {
            const kLower = k.toLowerCase().trim();
            const keyLower = key.toLowerCase().trim();
            return kLower === keyLower || kLower.includes(keyLower) || keyLower.includes(kLower);
          }
        );
        if (foundKey && record[foundKey]) {
          const value = String(record[foundKey]).trim();
          if (value) return value;
        }
      }
      return null;
    };

    // Try to get ID from various possible column names
    const id = getVal([
      'Task ID', 'ID', 'TaskId', 'Mã công việc', 'Mã CV', 'Mã',
      'STT', 'Số thứ tự'
    ]) || `task-${Date.now()}-${index}`;

    // Map Vietnamese headers - same as parseRowToTask
    const title = getVal([
      'Nội dung công việc', 'Công việc', 'Nhiệm vụ',
      'Task Name', 'Task', 'Title', 'Name', 
      'Tên công việc', 'Nội dung'
    ]);

    if (!title || title.trim() === '') {
      return null; // Skip empty rows
    }

    const description = getVal([
      'Hợp phần/ Nhiệm vụ', 'Hợp phần', 'Nhiệm vụ',
      'Description', 'Desc', 'Mô tả', 'Ghi chú'
    ]);

    const role = getVal([
      'Phân loại nhóm CV', 'Nhóm CV', 'Nhóm',
      'Role', 'Team', 'Vai trò', 'Category'
    ]);

    const priority = getVal([
      'Mức ưu tiên', 'Ưu tiên', 'Độ ưu tiên',
      'Priority'
    ]) || 'Medium';

    const startDate = getVal([
      'Ngày nhập', 'Ngày bắt đầu', 'Ngày tạo',
      'Start Date', 'Start', 'Created Date'
    ]);

    const dueDate = getVal([
      'THỜI GIAN THỰC HIỆN', 'Thời gian thực hiện', 'Hạn hoàn thành', 'Ngày kết thúc',
      'Due Date', 'Due', 'Deadline', 'End Date'
    ]);

    const status = getVal([
      'Status', 'State', 'Trạng thái', 'Tình trạng',
      'Hoàn thành', 'Đang tiến hành', 'Chưa bắt đầu'
    ]) || 'Not Started';

    const assignee = getVal([
      'Assignee', 'Assigned To', 'Owner', 'Người thực hiện', 'Người phụ trách',
      'Người được giao', 'Phụ trách'
    ]);

    const progress = parseInt(getVal([
      'Progress', '%', 'Tiến độ', 'Phần trăm',
      'Hoàn thành %', 'Tiến độ %'
    ]) || '0', 10) || 0;

    const notes = getVal([
      'Notes', 'Comments', 'Ghi chú', 'Nhận xét',
      'Ghi chú thêm', 'Lưu ý'
    ]);

    return {
      id: String(id),
      title: String(title),
      description: description,
      assignee: assignee,
      role: role,
      status: status,
      priority: priority,
      startDate: startDate,
      dueDate: dueDate,
      progress: progress,
      notes: notes,
    };
  }

  /**
   * Parse a row array to Task (for API responses)
   */
  private parseRowToTask(headers: string[], row: any[], rowIndex: number): Task | null {
    const getVal = (keys: string[]) => {
      for (const key of keys) {
        const index = headers.findIndex(
          (h) => {
            const headerLower = h.toLowerCase().trim();
            const keyLower = key.toLowerCase().trim();
            return headerLower === keyLower || headerLower.includes(keyLower) || keyLower.includes(headerLower);
          }
        );
        if (index >= 0 && row[index]) {
          const value = String(row[index]).trim();
          if (value) return value;
        }
      }
      return null;
    };

    // Try to get ID from various possible column names
    const id = getVal([
      'Task ID', 'ID', 'TaskId', 'Mã công việc', 'Mã CV', 'Mã',
      'STT', 'Số thứ tự', 'STT'
    ]) || `task-${Date.now()}-${rowIndex}`;

    // Map Vietnamese headers to task fields
    // "Nội dung công việc" = title
    const title = getVal([
      'Nội dung công việc', 'Công việc', 'Nhiệm vụ',
      'Task Name', 'Task', 'Title', 'Name',
      'Tên công việc', 'Nội dung'
    ]);

    // If no title, try to use first non-empty cell
    if (!title || title.trim() === '') {
      const firstCell = row.find((cell: any) => cell && String(cell).trim());
      if (!firstCell) {
        return null; // Skip completely empty rows
      }
      // Use first cell as title if it looks like a task
      const firstCellStr = String(firstCell).trim();
      if (firstCellStr.length < 3) {
        return null; // Too short to be a task
      }
      // Check if it's a header or summary row
      if (firstCellStr.match(/^(CÔNG VIỆC|BÁO CÁO|THÁNG|TỔNG|TỈ|SỐ|HỢP PHẦN)/i)) {
        return null;
      }
    }

    const finalTitle = title || String(row.find((cell: any) => cell && String(cell).trim()) || 'Untitled Task').trim();
    
    if (!finalTitle || finalTitle === 'Untitled Task' || finalTitle.length < 2) {
      return null;
    }

    // "Hợp phần/ Nhiệm vụ" = description or role
    const description = getVal([
      'Hợp phần/ Nhiệm vụ', 'Hợp phần', 'Nhiệm vụ',
      'Description', 'Desc', 'Mô tả', 'Ghi chú'
    ]);

    // "Phân loại nhóm CV" = role or category
    const role = getVal([
      'Phân loại nhóm CV', 'Nhóm CV', 'Nhóm',
      'Role', 'Team', 'Vai trò', 'Category'
    ]);

    // "Mức ưu tiên" = priority
    const priority = getVal([
      'Mức ưu tiên', 'Ưu tiên', 'Độ ưu tiên',
      'Priority'
    ]) || 'Medium';

    // "Ngày nhập" = start date or created date
    const startDate = getVal([
      'Ngày nhập', 'Ngày bắt đầu', 'Ngày tạo',
      'Start Date', 'Start', 'Created Date'
    ]);

    // "THỜI GIAN THỰC HIỆN" = due date or time period
    const dueDate = getVal([
      'THỜI GIAN THỰC HIỆN', 'Thời gian thực hiện', 'Hạn hoàn thành', 'Ngày kết thúc',
      'Due Date', 'Due', 'Deadline', 'End Date'
    ]);

    // Try to find status in various columns
    const status = getVal([
      'Status', 'State', 'Trạng thái', 'Tình trạng',
      'Hoàn thành', 'Đang tiến hành', 'Chưa bắt đầu'
    ]) || 'Not Started';

    // Try to find assignee
    const assignee = getVal([
      'Assignee', 'Assigned To', 'Owner', 'Người thực hiện', 'Người phụ trách',
      'Người được giao', 'Phụ trách'
    ]);

    // Progress - try to find percentage or progress column
    const progress = parseInt(getVal([
      'Progress', '%', 'Tiến độ', 'Phần trăm',
      'Hoàn thành %', 'Tiến độ %'
    ]) || '0', 10) || 0;

    // Notes - any additional info
    const notes = getVal([
      'Notes', 'Comments', 'Ghi chú', 'Nhận xét',
      'Ghi chú thêm', 'Lưu ý'
    ]);

    return {
      id: String(id),
      title: String(finalTitle),
      description: description,
      assignee: assignee,
      role: role,
      status: status,
      priority: priority,
      startDate: startDate,
      dueDate: dueDate,
      progress: progress,
      notes: notes,
    };
  }

  /**
   * Find the row number for a task ID
   */
  async findTaskRow(id: string): Promise<number | null> {
    if (!this.sheets) {
      throw new Error('Write operations require Google Sheets API authentication');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      const rows = response.data.values || [];
      const idColumnIndex = 0; // Assuming ID is in first column

      for (let i = this.dataStartRow - 1; i < rows.length; i++) {
        if (rows[i] && String(rows[i][idColumnIndex] || '').trim() === String(id).trim()) {
          return i + 1; // Google Sheets uses 1-based indexing
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding task row:', error);
      return null;
    }
  }

  /**
   * Create a new task in Google Sheets
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    if (!this.sheets) {
      throw new Error('Create operations require Google Sheets API authentication. Please set GOOGLE_SERVICE_ACCOUNT_JSON environment variable.');
    }

    // Generate ID if not provided
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = { ...task, id };

    try {
      // First, get headers to determine column order
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.headerRow}:${this.headerRow}`,
      });

      const headers = headerResponse.data.values?.[0] || [];
      const row = this.taskToRow(newTask, headers);

      // Append the new row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${this.dataStartRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      return newTask;
    } catch (error: any) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Update an existing task in Google Sheets
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    if (!this.sheets) {
      throw new Error('Update operations require Google Sheets API authentication. Please set GOOGLE_SERVICE_ACCOUNT_JSON environment variable.');
    }

    const rowNumber = await this.findTaskRow(id);
    if (!rowNumber) {
      throw new Error(`Task with ID ${id} not found`);
    }

    try {
      // Get current task data
      const currentResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${rowNumber}:${rowNumber}`,
      });

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.headerRow}:${this.headerRow}`,
      });

      const headers = headerResponse.data.values?.[0] || [];
      const currentRow = currentResponse.data.values?.[0] || [];
      
      // Parse current task
      const currentTask = this.parseRowToTask(headers, currentRow, rowNumber - 1);
      if (!currentTask) {
        throw new Error('Could not parse current task');
      }

      // Merge updates
      const updatedTask: Task = { ...currentTask, ...updates, id };

      // Convert to row format
      const updatedRow = this.taskToRow(updatedTask, headers);

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${rowNumber}:${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [updatedRow],
        },
      });

      return updatedTask;
    } catch (error: any) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Delete a task from Google Sheets
   */
  async deleteTask(id: string): Promise<void> {
    if (!this.sheets) {
      throw new Error('Delete operations require Google Sheets API authentication. Please set GOOGLE_SERVICE_ACCOUNT_JSON environment variable.');
    }

    const rowNumber = await this.findTaskRow(id);
    if (!rowNumber) {
      throw new Error(`Task with ID ${id} not found`);
    }

    try {
      // Delete the row using batchUpdate
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0, // Assuming first sheet
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber,
                },
              },
            },
          ],
        },
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Convert Task to row array based on headers
   */
  private taskToRow(task: Task, headers: string[]): any[] {
    const row: any[] = new Array(headers.length).fill('');

    const setVal = (keys: string[], value: any) => {
      for (const key of keys) {
        const index = headers.findIndex(
          (h) => h.toLowerCase().trim() === key.toLowerCase().trim()
        );
        if (index >= 0) {
          row[index] = value || '';
          return;
        }
      }
    };

    setVal(['Task ID', 'ID', 'TaskId', 'Mã công việc', 'Mã CV'], task.id);
    setVal(['Task Name', 'Task', 'Title', 'Name', 'Tên công việc', 'Công việc'], task.title);
    setVal(['Description', 'Desc', 'Mô tả'], task.description);
    setVal(['Assignee', 'Assigned To', 'Owner', 'Người thực hiện'], task.assignee);
    setVal(['Role', 'Team', 'Vai trò'], task.role);
    setVal(['Status', 'State', 'Trạng thái'], task.status);
    setVal(['Priority', 'Độ ưu tiên', 'Ưu tiên'], task.priority);
    setVal(['Start Date', 'Start', 'Ngày bắt đầu'], task.startDate);
    setVal(['Due Date', 'Due', 'Deadline', 'Ngày kết thúc'], task.dueDate);
    setVal(['Progress', '%', 'Tiến độ'], task.progress);
    setVal(['Notes', 'Comments', 'Ghi chú', 'Nhận xét'], task.notes);

    return row;
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsAPIService();
