import Image from "next/image";
import { Type } from "lucide-react";
import type { RecordSummary } from "../api-client/contracts";

type RecordThumbnailProps = {
  record: RecordSummary;
  className?: string;
};

export function RecordThumbnail({ record, className = "" }: RecordThumbnailProps) {
  return (
    <span className={`record-thumbnail ${className}`} aria-hidden="true">
      {record.kind === "image" && record.image_url ? (
        <Image
          src={record.image_url}
          alt=""
          width={record.image_width ?? 96}
          height={record.image_height ?? 96}
          sizes="96px"
          unoptimized
        />
      ) : (
        <Type size={15} />
      )}
    </span>
  );
}
