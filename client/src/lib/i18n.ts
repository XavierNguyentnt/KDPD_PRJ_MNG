export type Language = 'vi' | 'en';

export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    refresh: string;
    loading: string;
    error: string;
    success: string;
    close: string;
    confirm: string;
    confirmDelete: string;
  };
  
  // Dashboard
  dashboard: {
    title: string;
    overview: string;
    tasks: string;
    lastSynced: string;
    noTasksFound: string;
    createNew: string;
    allGroups: string;
    allStatus: string;
    byStatus: string;
    byStaff: string;
    byGroup: string;
    inProgressGroup: string;
    completedGroup: string;
    onSchedule: string;
    behindSchedule: string;
    trendChart: string;
    timeRangeDay: string;
    timeRangeWeek: string;
    timeRangeMonth: string;
    timeRangeQuarter: string;
    timeRangeYear: string;
    tasksInPeriod: string;
    clickBadgeToFilter: string;
  };
  filter: {
    staff: string;
    component: string;
    stage: string;
    status: string;
    vote: string;
    dateFrom: string;
    dateTo: string;
    allStaff: string;
    allComponents: string;
    allStages: string;
    allVotes: string;
  };
  
  // Task
  task: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assignee: string;
    group: string;
    dueDate: string;
    actualCompletedAt: string;
    progress: string;
    notes: string;
    createdAt: string;
    createNew: string;
    saveChanges: string;
    unassigned: string;
    noDateSet: string;
    titleRequired: string;
    selectGroup: string;
    selectStatus: string;
    selectPriority: string;
    // Workflow specific
    workflow: string;
    round: string;
    stage: string;
    startDate: string;
    completedDate: string;
    cancelReason: string;
    btv1: string;
    btv2: string;
    docDuyet: string;
    roundType: string;
    roundTypeLabel: string;
    selectRoundType: string;
    noWorkflow: string;
  };
  
  // Status
  status: {
    notStarted: string;
    inProgress: string;
    completed: string;
    blocked: string;
    cancelled: string;
  };
  
  // Priority
  priority: {
    low: string;
    medium: string;
    high: string;
    critical: string;
  };
  
  // Stats
  stats: {
    totalTasks: string;
    completed: string;
    inProgress: string;
    overdue: string;
    statusDistribution: string;
    tasksByPriority: string;
  };
  
  // Errors
  errors: {
    failedToLoad: string;
    failedToCreate: string;
    failedToUpdate: string;
    failedToDelete: string;
    retryConnection: string;
  };
}

const translations: Record<Language, Translations> = {
  vi: {
    common: {
      save: 'Lưu',
      cancel: 'Hủy',
      delete: 'Xóa',
      edit: 'Sửa',
      create: 'Tạo mới',
      search: 'Tìm kiếm',
      filter: 'Lọc',
      refresh: 'Làm mới',
      loading: 'Đang tải...',
      error: 'Lỗi',
      success: 'Thành công',
      close: 'Đóng',
      confirm: 'Xác nhận',
      confirmDelete: 'Bạn có chắc chắn muốn xóa công việc này?',
    },
    dashboard: {
      title: 'Bảng điều khiển',
      overview: 'Tổng quan',
      tasks: 'Công việc',
      lastSynced: 'Đồng bộ lần cuối',
      noTasksFound: 'Không tìm thấy công việc nào phù hợp.',
      createNew: 'Tạo mới',
      allGroups: 'Tất cả nhóm',
      allStatus: 'Tất cả trạng thái',
      byStatus: 'Theo trạng thái',
      byStaff: 'Theo nhân sự',
      byGroup: 'Theo nhóm công việc',
      inProgressGroup: 'Đang tiến hành',
      completedGroup: 'Đã hoàn thành',
      onSchedule: 'Đúng tiến độ',
      behindSchedule: 'Chậm tiến độ',
      trendChart: 'Xu hướng công việc theo thời gian',
      timeRangeDay: 'Ngày',
      timeRangeWeek: 'Tuần',
      timeRangeMonth: 'Tháng',
      timeRangeQuarter: 'Quý',
      timeRangeYear: 'Năm',
      tasksInPeriod: 'Số công việc',
      clickBadgeToFilter: 'Bấm vào badge để xem chi tiết',
    },
    filter: {
      staff: 'Nhân sự',
      component: 'Hợp phần',
      stage: 'Giai đoạn',
      status: 'Trạng thái',
      vote: 'Đánh giá',
      dateFrom: 'Từ ngày',
      dateTo: 'Đến ngày',
      allStaff: 'Tất cả nhân sự',
      allComponents: 'Tất cả hợp phần',
      allStages: 'Tất cả giai đoạn',
      allVotes: 'Tất cả đánh giá',
    },
    task: {
      title: 'Tiêu đề công việc',
      description: 'Mô tả',
      status: 'Trạng thái',
      priority: 'Độ ưu tiên',
      assignee: 'Người thực hiện',
      group: 'Nhóm CV',
      dueDate: 'Ngày hoàn thành dự kiến',
      actualCompletedAt: 'Ngày hoàn thành thực tế',
      progress: 'Tiến độ',
      notes: 'Ghi chú',
      createdAt: 'Tạo ngày',
      createNew: 'Tạo công việc mới',
      saveChanges: 'Lưu thay đổi',
      unassigned: 'Chưa giao',
      noDateSet: 'Chưa đặt hạn',
      titleRequired: 'Tiêu đề công việc là bắt buộc',
      selectGroup: 'Chọn nhóm CV',
      selectStatus: 'Chọn trạng thái',
      selectPriority: 'Chọn độ ưu tiên',
      // Workflow specific
      workflow: 'Quy trình Biên tập',
      round: 'Đọc bông',
      stage: 'Giai đoạn',
      startDate: 'Ngày nhận công việc',
      completedDate: 'Ngày hoàn thành',
      cancelReason: 'Lý do hủy',
      btv1: 'BTV 1',
      btv2: 'BTV 2',
      docDuyet: 'Người đọc duyệt',
      roundType: 'Loại bông',
      roundTypeLabel: 'Loại bông',
      selectRoundType: 'Chọn loại bông',
      noWorkflow: 'Chưa có workflow',
    },
    status: {
      notStarted: 'Chưa bắt đầu',
      inProgress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      blocked: 'Bị chặn',
      cancelled: 'Đã hủy',
    },
    priority: {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      critical: 'Khẩn cấp',
    },
    stats: {
      totalTasks: 'Tổng công việc',
      completed: 'Hoàn thành',
      inProgress: 'Đang tiến hành',
      overdue: 'Quá hạn',
      statusDistribution: 'Phân bố trạng thái',
      tasksByPriority: 'Công việc theo độ ưu tiên',
    },
    errors: {
      failedToLoad: 'Không thể tải dữ liệu',
      failedToCreate: 'Không thể tạo công việc',
      failedToUpdate: 'Không thể cập nhật công việc',
      failedToDelete: 'Không thể xóa công việc',
      retryConnection: 'Thử lại kết nối',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      refresh: 'Refresh',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      close: 'Close',
      confirm: 'Confirm',
      confirmDelete: 'Are you sure you want to delete this task?',
    },
    dashboard: {
      title: 'Dashboard',
      overview: 'Overview',
      tasks: 'Tasks',
      lastSynced: 'Last synced',
      noTasksFound: 'No tasks found matching your criteria.',
      createNew: 'Create New',
      allGroups: 'All Groups',
      allStatus: 'All Status',
      byStatus: 'By status',
      byStaff: 'By staff',
      byGroup: 'By task group',
      inProgressGroup: 'In progress',
      completedGroup: 'Completed',
      onSchedule: 'On schedule',
      behindSchedule: 'Behind schedule',
      trendChart: 'Task trend over time',
      timeRangeDay: 'Day',
      timeRangeWeek: 'Week',
      timeRangeMonth: 'Month',
      timeRangeQuarter: 'Quarter',
      timeRangeYear: 'Year',
      tasksInPeriod: 'Tasks',
      clickBadgeToFilter: 'Click badge to filter details',
    },
    filter: {
      staff: 'Staff',
      component: 'Component',
      stage: 'Stage',
      status: 'Status',
      vote: 'Evaluation',
      dateFrom: 'From date',
      dateTo: 'To date',
      allStaff: 'All staff',
      allComponents: 'All components',
      allStages: 'All stages',
      allVotes: 'All evaluations',
    },
    task: {
      title: 'Task Title',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      group: 'Group',
      dueDate: 'Expected completion date',
      actualCompletedAt: 'Actual completion date',
      progress: 'Progress',
      notes: 'Notes',
      createdAt: 'Created',
      createNew: 'Create New Task',
      saveChanges: 'Save Changes',
      unassigned: 'Unassigned',
      noDateSet: 'No date set',
      titleRequired: 'Task title is required',
      selectGroup: 'Select Group',
      selectStatus: 'Select status',
      selectPriority: 'Select priority',
      // Workflow specific
      workflow: 'Editorial Workflow',
      round: 'Round',
      stage: 'Stage',
      startDate: 'Receive Date',
      completedDate: 'Completion Date',
      cancelReason: 'Cancel reason',
      btv1: 'Editor 1',
      btv2: 'Editor 2',
      docDuyet: 'Reviewer',
      roundType: 'Round Type',
      roundTypeLabel: 'Round Type',
      selectRoundType: 'Select round type',
      noWorkflow: 'No workflow',
    },
    status: {
      notStarted: 'Not Started',
      inProgress: 'In Progress',
      completed: 'Completed',
      blocked: 'Blocked',
      cancelled: 'Cancelled',
    },
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    },
    stats: {
      totalTasks: 'Total Tasks',
      completed: 'Completed',
      inProgress: 'In Progress',
      overdue: 'Overdue',
      statusDistribution: 'Status Distribution',
      tasksByPriority: 'Tasks by Priority',
    },
    errors: {
      failedToLoad: 'Failed to load tasks',
      failedToCreate: 'Failed to create task',
      failedToUpdate: 'Failed to update task',
      failedToDelete: 'Failed to delete task',
      retryConnection: 'Retry Connection',
    },
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return key;
  }
  
  return typeof value === 'string' ? value : key;
}
