import { z } from "zod";

/**
 * Workflow system for tasks with multiple assignees and stages
 * Specifically designed for "Biên tập" group with multiple reading rounds
 */

// Stage status
export enum StageStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

// Stage types for Biên tập
export enum BienTapStageType {
  BTV1 = 'btv1', // Biên tập viên 1: Đọc lần 1, chỉnh sửa hình thức
  BTV2 = 'btv2', // Biên tập viên 2: Chỉnh sửa dựa trên bản của BTV1
  DOC_DUYET = 'doc_duyet', // Người đọc duyệt: Đọc duyệt bản thảo sau cùng
}

// Stage schema
export const stageSchema = z.object({
  type: z.nativeEnum(BienTapStageType),
  assignee: z.string().nullable(),
  status: z.nativeEnum(StageStatus),
  startDate: z.string().nullable(),
  completedDate: z.string().nullable(),
  notes: z.string().nullable(),
  progress: z.number().min(0).max(100).default(0),
});

export type Stage = z.infer<typeof stageSchema>;

// Round schema (một lần đọc bông)
export const roundSchema = z.object({
  roundNumber: z.number().min(1),
  roundType: z.string().nullable(), // Loại bông: "Tiền biên tập", "Bông thô", "Bông 1 (thô)", "Bông 1 (tinh)", "Bông chuyển in", etc.
  status: z.nativeEnum(StageStatus),
  startDate: z.string().nullable(),
  completedDate: z.string().nullable(),
  stages: z.array(stageSchema),
});

export type Round = z.infer<typeof roundSchema>;

// Workflow schema
export const workflowSchema = z.object({
  rounds: z.array(roundSchema),
  currentRound: z.number().min(1).default(1),
  totalRounds: z.number().min(1).default(1),
});

export type Workflow = z.infer<typeof workflowSchema>;

/**
 * Helper functions for workflow management
 */
export class BienTapWorkflowHelpers {
  /**
   * Create a new workflow with one round
   * Order: BTV2 → BTV1 → Người đọc duyệt
   */
  static createWorkflow(roundCount: number = 1): Workflow {
    const rounds: Round[] = [];
    
    for (let i = 1; i <= roundCount; i++) {
      rounds.push({
        roundNumber: i,
        roundType: null, // Will be set from Google Sheets data
        status: i === 1 ? StageStatus.NOT_STARTED : StageStatus.NOT_STARTED,
        startDate: null,
        completedDate: null,
        stages: [
          {
            type: BienTapStageType.BTV2, // BTV2: Đọc lần 1, chỉnh sửa hình thức
            assignee: null,
            status: StageStatus.NOT_STARTED,
            startDate: null,
            completedDate: null,
            notes: null,
            progress: 0,
          },
          {
            type: BienTapStageType.BTV1, // BTV1: Chỉnh sửa dựa trên bản của BTV2
            assignee: null,
            status: StageStatus.NOT_STARTED,
            startDate: null,
            completedDate: null,
            notes: null,
            progress: 0,
          },
          {
            type: BienTapStageType.DOC_DUYET, // Người đọc duyệt: Đọc duyệt bản thảo sau cùng
            assignee: null,
            status: StageStatus.NOT_STARTED,
            startDate: null,
            completedDate: null,
            notes: null,
            progress: 0,
          },
        ],
      });
    }
    
    return {
      rounds,
      currentRound: 1,
      totalRounds: roundCount,
    };
  }

  /**
   * Get current active stage in workflow
   */
  static getCurrentStage(workflow: Workflow): Stage | null {
    const currentRound = workflow.rounds.find(r => r.roundNumber === workflow.currentRound);
    if (!currentRound) return null;
    
    // Find first stage that's not completed
    return currentRound.stages.find(s => s.status !== StageStatus.COMPLETED) || null;
  }

  /**
   * Get all assignees from workflow
   */
  static getAllAssignees(workflow: Workflow): string[] {
    const assignees = new Set<string>();
    workflow.rounds.forEach(round => {
      round.stages.forEach(stage => {
        if (stage.assignee) {
          assignees.add(stage.assignee);
        }
      });
    });
    return Array.from(assignees);
  }

  /**
   * Calculate overall progress of workflow
   * Each stage (BTV2, BTV1, Người đọc duyệt) contributes 33.33% (100%/3)
   * Progress is cumulative: each completed stage adds 33.33%
   */
  static calculateProgress(workflow: Workflow): number {
    if (workflow.rounds.length === 0) return 0;
    
    // For current round only (or first round if no current round specified)
    const currentRound = workflow.rounds.find(r => r.roundNumber === workflow.currentRound) || workflow.rounds[0];
    if (!currentRound || currentRound.stages.length === 0) return 0;
    
    // Each stage contributes 33.33% (100% / 3 stages)
    const progressPerStage = 100 / 3;
    let totalProgress = 0;
    
    currentRound.stages.forEach(stage => {
      if (stage.status === StageStatus.COMPLETED) {
        totalProgress += progressPerStage;
      }
    });
    
    return Math.round(totalProgress);
  }

  /**
   * Get workflow status
   */
  static getWorkflowStatus(workflow: Workflow): StageStatus {
    if (workflow.rounds.length === 0) return StageStatus.NOT_STARTED;
    
    const allRoundsCompleted = workflow.rounds.every(round => 
      round.status === StageStatus.COMPLETED
    );
    if (allRoundsCompleted) return StageStatus.COMPLETED;
    
    const anyRoundInProgress = workflow.rounds.some(round => 
      round.status === StageStatus.IN_PROGRESS
    );
    if (anyRoundInProgress) return StageStatus.IN_PROGRESS;
    
    const anyRoundBlocked = workflow.rounds.some(round => 
      round.status === StageStatus.BLOCKED
    );
    if (anyRoundBlocked) return StageStatus.BLOCKED;
    
    return StageStatus.NOT_STARTED;
  }

  /**
   * Parse workflow from Google Sheets row data
   * Order: BTV2 → BTV1 → Người đọc duyệt
   * Reads: BTV2, BTV1, Người đọc duyệt and their dates
   */
  static parseFromSheetData(data: {
    bong?: string | null; // Loại bông: "Tiền biên tập", "Bông thô", "Bông 1 (thô)", "Bông 1 (tinh)", "Bông chuyển in", etc.
    btv1?: string | null;
    btv1ReceiveDate?: string | null;
    btv1CompleteDate?: string | null;
    btv2?: string | null;
    btv2ReceiveDate?: string | null;
    btv2CompleteDate?: string | null;
    docDuyet?: string | null;
    docDuyetReceiveDate?: string | null;
    docDuyetCompleteDate?: string | null;
  }): Workflow {
    const workflow = this.createWorkflow(1);
    const round = workflow.rounds[0];
    
    // Set round type from bông column
    if (data.bong) {
      round.roundType = data.bong.trim();
    }
    
    // Update BTV2 stage (stage[0] - first stage: Đọc lần 1, chỉnh sửa hình thức)
    // Progress: 33.33% when completed
    if (data.btv2 || data.btv2ReceiveDate || data.btv2CompleteDate) {
      round.stages[0].assignee = data.btv2 || null;
      round.stages[0].startDate = data.btv2ReceiveDate || null;
      round.stages[0].completedDate = data.btv2CompleteDate || null;
      round.stages[0].status = data.btv2CompleteDate 
        ? StageStatus.COMPLETED 
        : (data.btv2ReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
      // Progress is 33.33% when completed, 0 otherwise (will be calculated by calculateProgress)
      round.stages[0].progress = data.btv2CompleteDate ? 100 : 0;
    }
    
    // Update BTV1 stage (stage[1] - second stage: Chỉnh sửa dựa trên bản của BTV2)
    // Progress: 33.33% when completed
    if (data.btv1 || data.btv1ReceiveDate || data.btv1CompleteDate) {
      round.stages[1].assignee = data.btv1 || null;
      round.stages[1].startDate = data.btv1ReceiveDate || null;
      round.stages[1].completedDate = data.btv1CompleteDate || null;
      round.stages[1].status = data.btv1CompleteDate 
        ? StageStatus.COMPLETED 
        : (data.btv1ReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
      // Progress is 33.33% when completed, 0 otherwise (will be calculated by calculateProgress)
      round.stages[1].progress = data.btv1CompleteDate ? 100 : 0;
    }
    
    // Update Người đọc duyệt stage (stage[2] - third stage: Đọc duyệt bản thảo sau cùng)
    // Progress: 33.33% when completed
    if (data.docDuyet || data.docDuyetReceiveDate || data.docDuyetCompleteDate) {
      round.stages[2].assignee = data.docDuyet || null;
      round.stages[2].startDate = data.docDuyetReceiveDate || null;
      round.stages[2].completedDate = data.docDuyetCompleteDate || null;
      round.stages[2].status = data.docDuyetCompleteDate 
        ? StageStatus.COMPLETED 
        : (data.docDuyetReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
      // Progress is 33.33% when completed, 0 otherwise (will be calculated by calculateProgress)
      round.stages[2].progress = data.docDuyetCompleteDate ? 100 : 0;
    }
    
    // Update round status
    const allStagesCompleted = round.stages.every(s => s.status === StageStatus.COMPLETED);
    const anyStageInProgress = round.stages.some(s => s.status === StageStatus.IN_PROGRESS);
    round.status = allStagesCompleted 
      ? StageStatus.COMPLETED 
      : (anyStageInProgress ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
    
    // Set round dates - start with BTV2, end with Người đọc duyệt
    round.startDate = data.btv2ReceiveDate || null;
    round.completedDate = data.docDuyetCompleteDate || null;
    
    return workflow;
  }
}
