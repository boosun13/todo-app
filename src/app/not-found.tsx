import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">ページが見つかりません</h1>
      <p className="text-muted-foreground">削除されたか、URL が間違っている可能性があります。</p>
      <Button render={<Link href="/" />}>一覧に戻る</Button>
    </div>
  );
}
