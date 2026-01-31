"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { api } from "@shared/routes";

interface WorksImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorksImport({ open, onOpenChange }: WorksImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(api.works.downloadTemplate.path, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Không thể tải file mẫu");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mau-tac-pham-tuyen-dich.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Thành công",
        description: "Đã tải file mẫu thành công",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể tải file mẫu",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    const validExtensions = [".xlsx", ".xls"];

    const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
    const isValidType = validTypes.includes(selectedFile.type) || validExtensions.includes(fileExtension);

    if (!isValidType) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file Excel (.xlsx hoặc .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file để tải lên",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.works.import.path, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Không thể import file");
      }

      const result = await res.json();
      const { success, errors } = result;

      // Refresh works list
      queryClient.invalidateQueries({ queryKey: ["works"] });

      // Show results
      if (errors && errors.length > 0) {
        toast({
          title: `Đã import ${success} tác phẩm thành công`,
          description: `Có ${errors.length} lỗi. Xem console để biết chi tiết.`,
          variant: success > 0 ? "default" : "destructive",
        });
        console.error("Import errors:", errors);
      } else {
        toast({
          title: "Thành công",
          description: `Đã import ${success} tác phẩm thành công`,
        });
      }

      // Reset and close
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể import file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import tác phẩm từ Excel</DialogTitle>
          <DialogDescription>
            Tải file mẫu, điền thông tin tác phẩm, sau đó tải lên file Excel để import hàng loạt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="w-full"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Tải file mẫu Excel
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn file Excel đã điền</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
                id="works-import-file"
              />
              <label
                htmlFor="works-import-file"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Chọn file Excel (.xlsx hoặc .xls)"}
                </span>
              </label>
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                Đã chọn: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Hủy
          </Button>
          <Button type="button" onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
