import React, { useState, useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { ShortLinkDto } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Copy,
  Check,
  Upload,
  Trash2,
  Sparkles,
  QrCode as QrIcon,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: ShortLinkDto | null;
}

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

interface ColorPalette {
  name: string;
  fg: string;
  bg: string;
}

const COLOR_PALETTES: ColorPalette[] = [
  { name: "经典黑白", fg: "#09090b", bg: "#ffffff" },
  { name: "极客灰", fg: "#18181b", bg: "#f4f4f5" },
  { name: "科技深蓝", fg: "#1d4ed8", bg: "#ffffff" },
  { name: "翡翠森林", fg: "#047857", bg: "#ffffff" },
  { name: "典雅高贵", fg: "#6b21a8", bg: "#ffffff" },
  { name: "暗夜黑金", fg: "#000000", bg: "#fef08a" },
];

export const QrCodeDialog: React.FC<QrCodeDialogProps> = ({
  open,
  onOpenChange,
  link,
}) => {
  const [fgColor, setFgColor] = useState("#09090b");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [level, setLevel] = useState<ErrorCorrectionLevel>("M");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const highResCanvasRef = useRef<HTMLCanvasElement>(null);

  if (!link) return null;

  const qrValue = link.fullShortUrl || link.originalUrl;
  const fileNameSlug = link.slug || "qr";

  // 应用预设色彩卡片
  const handleApplyPalette = (palette: ColorPalette) => {
    setFgColor(palette.fg);
    setBgColor(palette.bg);
    toast.success(`已应用「${palette.name}」配色`);
  };

  // 上传中心 Logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("请选择有效的图片文件 (PNG, JPG, SVG 等)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo 图片体积建议不超过 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setLogoSrc(dataUrl);
      // 上传 Logo 后自动将容错率提升至 H，保证可读性
      if (level === "L" || level === "M") {
        setLevel("H");
        toast.info("已自动将容错率提升至高等级 (H)，保障中心 Logo 嵌入后的扫码成功率");
      } else {
        toast.success("Logo 已成功嵌入二维码中心");
      }
    };
    reader.readAsDataURL(file);

    // 清空 input 保证可重复选择
    e.target.value = "";
  };

  // 移除 Logo
  const handleRemoveLogo = () => {
    setLogoSrc(null);
    toast.success("已移除中心 Logo");
  };

  // 下载高清 PNG (1024x1024 导出分辨率)
  const handleDownloadPng = async () => {
    try {
      setDownloading(true);
      const canvas = highResCanvasRef.current;
      if (!canvas) {
        throw new Error("Canvas 实例未就绪");
      }

      // 获取当前 Canvas 的 Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("生成 PNG 失败");
          setDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileNameSlug}-qrcode.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("高清 PNG 二维码已导出下载");
        setDownloading(false);
      }, "image/png");
    } catch (err: any) {
      console.error("下载 PNG 错误", err);
      toast.error("导出 PNG 失败，请重试");
      setDownloading(false);
    }
  };

  // 下载矢量 SVG
  const handleDownloadSvg = () => {
    try {
      if (!svgWrapperRef.current) return;
      const svgEl = svgWrapperRef.current.querySelector("svg");
      if (!svgEl) {
        toast.error("未找到 SVG 元素");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileNameSlug}-qrcode.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("矢量无损 SVG 二维码已导出下载");
    } catch (err: any) {
      console.error("下载 SVG 错误", err);
      toast.error("导出 SVG 失败");
    }
  };

  // 复制二维码图像到剪贴板
  const handleCopyImage = async () => {
    try {
      const canvas = highResCanvasRef.current;
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopied(true);
          toast.success("二维码图片已复制到剪贴板");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("当前浏览器环境不支持直接拷贝图片流，请直接下载 PNG");
        }
      }, "image/png");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <QrIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                定制专属动态二维码
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                配套短链: <span className="font-mono font-medium text-foreground">{qrValue}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* 左侧：实时二维码高清画布预览区 */}
          <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-border bg-muted/30 p-6">
            <div
              className="relative p-4 rounded-xl shadow-sm border border-border/60 transition-all flex items-center justify-center"
              style={{ backgroundColor: bgColor }}
            >
              {/* 界面中可直接观察到的 SVG 动态预览 */}
              <div ref={svgWrapperRef}>
                <QRCodeSVG
                  value={qrValue}
                  size={192}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level={level}
                  includeMargin={false}
                  imageSettings={
                    logoSrc
                      ? {
                          src: logoSrc,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>

              {/* 后台隐藏的高清 1024x1024 Canvas，专用于超高清无损 PNG 导出与复制 */}
              <div className="hidden">
                <QRCodeCanvas
                  ref={highResCanvasRef}
                  value={qrValue}
                  size={1024}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level={level}
                  includeMargin={true}
                  imageSettings={
                    logoSrc
                      ? {
                          src: logoSrc,
                          height: 220,
                          width: 220,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-xs font-medium text-foreground">
                微信、相机扫码即刻 302 重定向
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>容错级别: {level} ({level === "H" ? "高·30%" : level === "Q" ? "较高·25%" : level === "M" ? "标准·15%" : "低·7%"})</span>
              </div>
            </div>

            {/* 快速复制按钮 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyImage}
              className="w-full text-xs gap-1.5 h-8"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">已复制图像</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>复制图像到剪贴板</span>
                </>
              )}
            </Button>
          </div>

          {/* 右侧：样式与品牌控制配置面板 */}
          <div className="space-y-5">
            {/* 预置经典调色板 */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>预置主题色卡</span>
                <Sparkles className="h-3 w-3 text-muted-foreground" />
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => handleApplyPalette(palette)}
                    className="flex items-center gap-2 rounded-lg border border-border p-1.5 text-left text-xs transition-colors hover:bg-muted/60"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: palette.fg }}
                    />
                    <span className="text-[11px] text-foreground truncate">
                      {palette.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 精确颜色拾取与 HEX 输入 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">二维码前景色</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-md border border-input p-0.5"
                    aria-label="选取前景色"
                  />
                  <Input
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-8 text-xs font-mono uppercase"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">背景色</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-md border border-input p-0.5"
                    aria-label="选取背景色"
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 text-xs font-mono uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* 容错率设置 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">容错率等级 (ECC)</Label>
                <span className="text-[11px] text-muted-foreground">嵌入Logo建议选 H</span>
              </div>
              <Select
                value={level}
                onValueChange={(val) => setLevel(val as ErrorCorrectionLevel)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L 级 (7% 容错，码点稀疏)</SelectItem>
                  <SelectItem value="M">M 级 (15% 容错，标准推荐)</SelectItem>
                  <SelectItem value="Q">Q 级 (25% 容错，较高)</SelectItem>
                  <SelectItem value="H">H 级 (30% 容错，嵌入 Logo 必选)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 品牌 Logo 居中嵌入 */}
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  中心品牌 Logo 嵌入
                </Label>
                {logoSrc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    移除
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {logoSrc ? (
                <div className="flex items-center gap-3">
                  <img
                    src={logoSrc}
                    alt="Logo Preview"
                    className="h-9 w-9 rounded-md border border-border object-contain bg-background p-0.5"
                  />
                  <div className="text-[11px] text-muted-foreground flex-1 truncate">
                    已居中合成 (自适应白底抗遮挡)
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-[11px] px-2"
                  >
                    更换
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-8 text-xs gap-1.5 border-dashed"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>上传品牌 Logo 图标</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 底部导出操作按钮组 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            关闭
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadSvg}
            className="text-xs gap-1.5 font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载矢量 SVG</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={downloading}
            onClick={handleDownloadPng}
            className="text-xs gap-1.5 font-medium shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载高清 PNG (1024px)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
