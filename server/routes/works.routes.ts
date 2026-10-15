import type { Express } from "express";
import { z } from "zod";
import multer from "multer";
import { api } from "@shared/routes";
import { UserRole } from "@shared/schema";
import { db } from "../db";
import * as dbStorage from "../db-storage";
import { requireAuth, requireRole } from "../middleware";

function requireDb() {
  if (!db) {
    throw new Error("Database not configured. Set DATABASE_URL.");
  }
  return db;
}

/** Chuẩn hóa body works: pg numeric expect string, client có thể gửi number. */
function normalizeWorkBody(body: unknown): Record<string, unknown> {
  const b =
    typeof body === "object" && body !== null
      ? { ...(body as Record<string, unknown>) }
      : {};
  if (typeof (b as Record<string, unknown>).estimateFactor === "number") {
    (b as Record<string, unknown>).estimateFactor = String(
      (b as Record<string, unknown>).estimateFactor,
    );
  }
  return b as Record<string, unknown>;
}

export function registerWorksRoutes(app: Express): void {
  // Danh sách tác phẩm
  app.get(api.works.list.path, requireAuth, async (_req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });
      const list = await dbStorage.getWorksFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching works:", err);
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch works",
      });
    }
  });

  // Tải file mẫu Excel import tác phẩm
  app.get(api.works.downloadTemplate.path, requireAuth, async (_req, res) => {
    try {
      if (!db)
        return res.status(503).json({ message: "Database not configured" });

      let XLSX: any;
      try {
        const xlsxModule = await import("xlsx");
        XLSX = xlsxModule.default || xlsxModule;
      } catch (xlsxErr) {
        console.error("Error importing xlsx:", xlsxErr);
        return res.status(500).json({
          message:
            "Failed to load xlsx library: " +
            (xlsxErr instanceof Error ? xlsxErr.message : "Unknown error"),
        });
      }

      let components: any[] = [];
      try {
        components = await dbStorage.getComponentsFromDb();
      } catch (compErr) {
        console.error("Error fetching components:", compErr);
      }

      const wb = XLSX.utils.book_new();
      const headers = [
        "Hợp phần (Component)",
        "Giai đoạn (Stage)",
        "Tiêu đề tiếng Việt (Title VI)",
        "Tiêu đề Hán Nôm (Title Hán Nôm)",
        "Mã tài liệu (Document Code)",
        "Số từ cơ sở (Base Word Count)",
        "Số trang cơ sở (Base Page Count)",
        "Hệ số ước tính (Estimate Factor)",
        "Số từ ước tính (Estimate Word Count)",
        "Số trang ước tính (Estimate Page Count)",
        "Ghi chú (Note)",
      ];

      const sampleRow = [
        components[0]?.name || "Ví dụ: Hợp phần 1",
        "Ví dụ: Giai đoạn 1",
        "Ví dụ: Tiêu đề tiếng Việt",
        "Ví dụ: Tiêu đề Hán Nôm",
        "Ví dụ: DOC001",
        "1000",
        "10",
        "1.2",
        "1200",
        "12",
        "Ghi chú mẫu",
      ];

      const wsData = [headers, sampleRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws["!cols"] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 30 },
        { wch: 30 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Tác phẩm");

      const componentsData = [
        ["Tên hợp phần (Component Name)"],
        ...(components.length > 0
          ? components.map((c) => [c.name || ""])
          : [["Chưa có hợp phần nào"]]),
      ];
      const componentsWs = XLSX.utils.aoa_to_sheet(componentsData);
      componentsWs["!cols"] = [{ wch: 30 }];
      XLSX.utils.book_append_sheet(wb, componentsWs, "Danh sách hợp phần");

      let buffer: Buffer;
      try {
        buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      } catch (writeErr) {
        console.error("Error writing Excel buffer:", writeErr);
        return res.status(500).json({
          message:
            "Failed to generate Excel file: " +
            (writeErr instanceof Error ? writeErr.message : "Unknown error"),
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=mau-tac-pham-tuyen-dich.xlsx",
      );
      res.send(buffer);
    } catch (err) {
      console.error("Error generating template:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate template";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Chi tiết tác phẩm
  app.get(api.works.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getWorkById(id);
      if (!row) return res.status(404).json({ message: "Work not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch work",
      });
    }
  });

  // Tạo tác phẩm
  app.post(api.works.create.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const body = normalizeWorkBody(req.body);
      const input = api.works.create.input.parse(body);
      const row = await dbStorage.createWork(input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to create work",
      });
    }
  });

  // Sửa tác phẩm
  app.patch(api.works.update.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const body = normalizeWorkBody(req.body);
      const input = api.works.update.input.parse(body);
      const row = await dbStorage.updateWork(id, input);
      res.json(row);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message.includes("not found"))
        return res.status(404).json({ message: err.message });
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to update work",
      });
    }
  });

  // Xóa tác phẩm
  app.delete(
    api.works.delete.path,
    requireAuth,
    requireRole(UserRole.ADMIN, UserRole.MANAGER),
    async (req, res) => {
      try {
        requireDb();
        const id = Array.isArray(req.params.id)
          ? req.params.id[0]
          : req.params.id;
        await dbStorage.deleteWork(id);
        res.json({ message: "Đã xóa tác phẩm" });
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found"))
          return res.status(404).json({ message: err.message });
        res.status(500).json({
          message: err instanceof Error ? err.message : "Failed to delete work",
        });
      }
    },
  );

  // Import tác phẩm từ Excel
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });

  app.post(
    api.works.import.path,
    requireAuth,
    requireRole(UserRole.ADMIN, UserRole.MANAGER),
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({
            message:
              "File upload error: " +
              (err instanceof Error ? err.message : "Unknown error"),
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        requireDb();
        const file = (req as any).file;
        if (!file) {
          return res
            .status(400)
            .json({ message: "No file uploaded. Please select a file." });
        }

        let XLSX: any;
        try {
          const xlsxModule = await import("xlsx");
          XLSX = xlsxModule.default || xlsxModule;
        } catch (xlsxErr) {
          console.error("Error importing xlsx:", xlsxErr);
          return res.status(500).json({
            message:
              "Failed to load xlsx library: " +
              (xlsxErr instanceof Error ? xlsxErr.message : "Unknown error"),
          });
        }

        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as any[][];

        if (data.length < 2) {
          return res.status(400).json({
            message:
              "File không có dữ liệu. Cần ít nhất 1 dòng dữ liệu (không tính header).",
          });
        }

        const components = await dbStorage.getComponentsFromDb();
        const componentMap = new Map(
          components.map((c) => [c.name?.toLowerCase().trim(), c.id]),
        );

        const errors: string[] = [];
        let successCount = 0;

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          try {
            const componentName = String(row[0] || "").trim();
            const stage = String(row[1] || "").trim() || null;
            const titleVi = String(row[2] || "").trim() || null;
            const titleHannom = String(row[3] || "").trim() || null;
            const documentCode = String(row[4] || "").trim() || null;
            const baseWordCount = row[5]
              ? parseInt(String(row[5]), 10)
              : null;
            const basePageCount = row[6]
              ? parseInt(String(row[6]), 10)
              : null;
            const estimateFactor = row[7] ? String(row[7]) : null;
            const estimateWordCount = row[8]
              ? parseInt(String(row[8]), 10)
              : null;
            const estimatePageCount = row[9]
              ? parseInt(String(row[9]), 10)
              : null;
            const note = String(row[10] || "").trim() || null;

            if (!componentName) {
              errors.push(`Dòng ${i + 1}: Thiếu tên hợp phần`);
              continue;
            }

            if (!titleVi) {
              errors.push(`Dòng ${i + 1}: Thiếu tiêu đề tiếng Việt`);
              continue;
            }

            const componentId = componentMap.get(componentName.toLowerCase());
            if (!componentId) {
              errors.push(
                `Dòng ${i + 1}: Không tìm thấy hợp phần "${componentName}"`,
              );
              continue;
            }

            const workData: any = {
              componentId,
              stage,
              titleVi,
              titleHannom,
              documentCode,
              baseWordCount:
                baseWordCount && !isNaN(baseWordCount) ? baseWordCount : null,
              basePageCount:
                basePageCount && !isNaN(basePageCount) ? basePageCount : null,
              estimateFactor: estimateFactor || null,
              estimateWordCount:
                estimateWordCount && !isNaN(estimateWordCount)
                  ? estimateWordCount
                  : null,
              estimatePageCount:
                estimatePageCount && !isNaN(estimatePageCount)
                  ? estimatePageCount
                  : null,
              note,
            };

            await dbStorage.createWork(workData);
            successCount++;
          } catch (rowErr) {
            errors.push(
              `Dòng ${i + 1}: ${rowErr instanceof Error ? rowErr.message : "Lỗi không xác định"}`,
            );
          }
        }

        res.json({ success: successCount, errors });
      } catch (err) {
        console.error("Error importing works:", err);
        res.status(500).json({
          message:
            err instanceof Error ? err.message : "Failed to import works",
        });
      }
    },
  );

  // Danh sách hợp phần
  app.get(api.components.list.path, requireAuth, async (_req, res) => {
    try {
      requireDb();
      const list = await dbStorage.getComponentsFromDb();
      res.json(list);
    } catch (err) {
      console.error("Error fetching components:", err);
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch components",
      });
    }
  });

  // Chi tiết hợp phần
  app.get(api.components.get.path, requireAuth, async (req, res) => {
    try {
      requireDb();
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const row = await dbStorage.getComponentById(id);
      if (!row) return res.status(404).json({ message: "Component not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : "Failed to fetch component",
      });
    }
  });
}
