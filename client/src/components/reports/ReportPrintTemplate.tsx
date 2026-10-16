import React from "react";
import { formatDateDDMMYYYY } from "@/lib/utils";

interface ReportPrintHeaderProps {
  title: string;
  scopeLabel: string;
  periodLabel: string;
  dateRange: string;
  authorName?: string;
  departmentName?: string;
}

export function ReportPrintHeader({
  title,
  scopeLabel,
  periodLabel,
  dateRange,
  authorName,
  departmentName,
}: ReportPrintHeaderProps) {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  return (
    <div className="hidden print:block mb-8 font-serif text-black border-b pb-6 border-black/30">
      {/* KHỐI CƠ QUAN CHỦ QUẢN & QUỐC HIỆU */}
      <div className="grid grid-cols-2 gap-4 items-start text-center mb-6">
        {/* CỘT TRÁI: ĐƠN VỊ CHỦ QUẢN */}
        <div className="flex flex-col items-center">
          <p className="text-xs uppercase font-medium tracking-wide">
            DỰ ÁN BIÊN DỊCH VÀ XUẤT BẢN
          </p>
          <p className="text-sm uppercase font-bold tracking-wider mt-0.5">
            KINH ĐIỂN PHƯƠNG ĐÔNG
          </p>
          {departmentName && (
            <p className="text-xs italic mt-0.5 text-gray-700">
              Đơn vị: {departmentName}
            </p>
          )}
          <div className="w-24 h-[1px] bg-black my-1" />
          <p className="text-[11px] text-gray-600">Số: ...... /BC-KDPD</p>
        </div>

        {/* CỘT PHẢI: QUỐC HIỆU & TIÊU NGỮ */}
        <div className="flex flex-col items-center">
          <p className="text-xs uppercase font-bold tracking-wider">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="text-xs font-semibold underline underline-offset-4 mt-0.5">
            Độc lập - Tự do - Hạnh phúc
          </p>
          <div className="w-32 h-[1px] bg-black my-1" />
          <p className="text-xs italic mt-1 text-gray-700">
            Hà Nội, ngày {day} tháng {month} năm {year}
          </p>
        </div>
      </div>

      {/* TIÊU ĐỀ BÁO CÁO */}
      <div className="text-center space-y-1.5 my-6">
        <h1 className="text-lg font-bold uppercase tracking-wide text-black">
          {title}
        </h1>
        <p className="text-xs font-medium text-gray-800">
          Chu kỳ: <span className="font-semibold">{periodLabel}</span> ({dateRange})
        </p>
        {authorName && (
          <p className="text-xs text-gray-700">
            Người thực hiện: <span className="font-semibold">{authorName}</span>
          </p>
        )}
      </div>
    </div>
  );
}

interface ReportPrintSignaturesProps {
  scope: "personal" | "department" | "organization";
  authorName?: string;
  departmentName?: string;
}

export function ReportPrintSignatures({
  scope,
  authorName,
  departmentName,
}: ReportPrintSignaturesProps) {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  if (scope === "personal") {
    return (
      <div className="hidden print:block mt-12 pt-6 font-serif text-black break-inside-avoid page-break-inside-avoid">
        <div className="text-right italic text-xs mb-3 text-gray-700">
          Hà Nội, ngày {day} tháng {month} năm {year}
        </div>
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          {/* CỘT 1: NƠI NHẬN */}
          <div className="text-left space-y-1">
            <p className="font-bold text-[11px] uppercase">Nơi nhận:</p>
            <p className="text-[11px] text-gray-700">- Ban Quản lý Dự án;</p>
            <p className="text-[11px] text-gray-700">- Trưởng bộ phận;</p>
            <p className="text-[11px] text-gray-700">- Lưu: Hồ sơ cá nhân.</p>
          </div>

          {/* CỘT 2: TRƯỞNG BỘ PHẬN */}
          <div className="flex flex-col items-center">
            <p className="font-bold uppercase text-[11px]">TRƯỞNG BỘ PHẬN</p>
            <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-gray-400 italic text-[11px]">................................................</p>
          </div>

          {/* CỘT 3: NGƯỜI LẬP BIỂU */}
          <div className="flex flex-col items-center">
            <p className="font-bold uppercase text-[11px]">NGƯỜI LẬP BÁO CÁO</p>
            <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="font-semibold text-xs text-black">
              {authorName || "................................................"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (scope === "department") {
    return (
      <div className="hidden print:block mt-12 pt-6 font-serif text-black break-inside-avoid page-break-inside-avoid">
        <div className="text-right italic text-xs mb-3 text-gray-700">
          Hà Nội, ngày {day} tháng {month} năm {year}
        </div>
        <div className="grid grid-cols-4 gap-4 text-center text-xs">
          {/* CỘT 1: NƠI NHẬN */}
          <div className="text-left space-y-1">
            <p className="font-bold text-[11px] uppercase">Nơi nhận:</p>
            <p className="text-[11px] text-gray-700">- Ban Giám đốc Dự án;</p>
            <p className="text-[11px] text-gray-700">- Phòng Hành chính - Tổng hợp;</p>
            <p className="text-[11px] text-gray-700">- Lưu: Văn phòng nhóm.</p>
          </div>

          {/* CỘT 2: NGƯỜI LẬP BIỂU */}
          <div className="flex flex-col items-center">
            <p className="font-bold uppercase text-[11px]">NGƯỜI LẬP BIỂU</p>
            <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-gray-400 italic text-[11px]">....................................</p>
          </div>

          {/* CỘT 3: TRƯỞNG NHÓM NGHIỆP VỤ */}
          <div className="flex flex-col items-center">
            <p className="font-bold uppercase text-[11px]">TRƯỞNG BỘ PHẬN</p>
            <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-20" />
            <p className="text-gray-400 italic text-[11px]">....................................</p>
          </div>

          {/* CỘT 4: LÃNH ĐẠO PHÊ DUYỆT */}
          <div className="flex flex-col items-center">
            <p className="font-bold uppercase text-[11px]">BAN GIÁM ĐỐC DUYỆT</p>
            <p className="italic text-[10px] text-gray-500">(Ký, đóng dấu)</p>
            <div className="h-20" />
            <p className="text-gray-400 italic text-[11px]">....................................</p>
          </div>
        </div>
      </div>
    );
  }

  // Toàn thể tổ chức
  return (
    <div className="hidden print:block mt-12 pt-6 font-serif text-black break-inside-avoid page-break-inside-avoid">
      <div className="text-right italic text-xs mb-3 text-gray-700">
        Hà Nội, ngày {day} tháng {month} năm {year}
      </div>
      <div className="grid grid-cols-4 gap-4 text-center text-xs">
        {/* CỘT 1: NƠI NHẬN */}
        <div className="text-left space-y-1">
          <p className="font-bold text-[11px] uppercase">Nơi nhận:</p>
          <p className="text-[11px] text-gray-700">- Hội đồng Cố vấn Dự án;</p>
          <p className="text-[11px] text-gray-700">- Ban Giám đốc Dự án;</p>
          <p className="text-[11px] text-gray-700">- Các Trưởng Hợp phần;</p>
          <p className="text-[11px] text-gray-700">- Lưu: Văn thư KDPD.</p>
        </div>

        {/* CỘT 2: THƯ KÝ TỔNG HỢP */}
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase text-[11px]">THƯ KÝ TỔNG HỢP</p>
          <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
          <div className="h-20" />
          <p className="text-gray-400 italic text-[11px]">....................................</p>
        </div>

        {/* CỘT 3: PHỤ TRÁCH TÀI CHÍNH */}
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase text-[11px]">PHỤ TRÁCH TÀI CHÍNH</p>
          <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
          <div className="h-20" />
          <p className="text-gray-400 italic text-[11px]">....................................</p>
        </div>

        {/* CỘT 4: GIÁM ĐỐC DỰ ÁN */}
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase text-[11px]">GIÁM ĐỐC DỰ ÁN</p>
          <p className="italic text-[10px] text-gray-500">(Ký tên và đóng dấu)</p>
          <div className="h-20" />
          <p className="text-gray-400 italic text-[11px]">....................................</p>
        </div>
      </div>
    </div>
  );
}
