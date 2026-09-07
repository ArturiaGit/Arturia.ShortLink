import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Link2,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState<{
    nickname?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  const [submitting, setSubmitting] = useState(false);

  // 校验逻辑
  const isNicknameValid = nickname.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  // 允许的字符白名单：英文字母、数字以及支持的特殊字符 (! " # $ % & ' ( ) * + , - . / : ; @)
  const hasOnlyAllowedChars = /^[a-zA-Z0-9!\"#$%&'()*+,\-./:;@]*$/.test(password);
  const hasIllegalChars = password.length > 0 && !hasOnlyAllowedChars;

  // 密码有效判定：长度>=8、含字母、含数字，且不得包含未允许非法字符
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && hasOnlyAllowedChars;
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === password;

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      nickname: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isNicknameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
      return;
    }

    setSubmitting(true);
    const success = await register(nickname.trim(), email.trim(), password);
    setSubmitting(false);
    if (success) {
      navigate("/", { replace: true });
    }
  };

  const handleFillDemoData = () => {
    setNickname("极客增长先锋队");
    setEmail("growth.demo@arturia.link");
    setPassword("Arturia2026@");
    setConfirmPassword("Arturia2026@");
    setTouched({});
  };

  const canSubmit = isNicknameValid && isEmailValid && isPasswordValid && isConfirmValid;

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-50/50 p-6 md:p-10 animate-in fade-in-0 duration-300">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-zinc-900 text-white shadow-sm">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Arturia.ShortLink
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              企业级多租户短链 SaaS 运营与分析平台
            </p>
          </div>
        </div>

        {/* Card (Aligned with shadcn/ui signup-01 New York specification) */}
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              创建企业账号
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              请在下方填写基础信息以建立您的首个独立工作空间
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name / Nickname */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">
                  团队或用户昵称
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="例如：极客增长团队"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onBlur={() => handleBlur("nickname")}
                  required
                  disabled={submitting}
                  className={
                    touched.nickname && !isNicknameValid
                      ? "border-destructive focus-visible:ring-destructive h-9 text-sm"
                      : "h-9 text-sm"
                  }
                />
                {touched.nickname && !isNicknameValid && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-in fade-in-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>昵称长度至少为 2 个字符</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  企业工作邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  required
                  disabled={submitting}
                  className={
                    touched.email && !isEmailValid
                      ? "border-destructive focus-visible:ring-destructive h-9 text-sm"
                      : "h-9 text-sm"
                  }
                />
                {touched.email && !isEmailValid ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-in fade-in-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>请输入有效的电子邮箱格式 (如 user@company.com)</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    仅用于接收工作空间与短链安全通知，绝不对外公开。
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">
                  设置登录密码
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    required
                    disabled={submitting}
                    className={`h-9 pr-9 text-sm ${
                      touched.password && !isPasswordValid
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "隐藏密码" : "显示密码"}
                    </span>
                  </Button>
                </div>
                {touched.password && !isPasswordValid ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-in fade-in-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {hasIllegalChars
                        ? "密码包含不支持的字符（不支持空格、中文标点或未允许符号）"
                        : "密码需至少 8 位，且必须包含英文字母与阿拉伯数字"}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    需至少 8 位，且包含英文字母与数字（支持常见特殊字符）。
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium">
                  确认登录密码
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="请再次输入相同密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    required
                    disabled={submitting}
                    className={`h-9 pr-9 text-sm ${
                      touched.confirmPassword && !isConfirmValid
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-0 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? "隐藏密码" : "显示密码"}
                    </span>
                  </Button>
                </div>
                {touched.confirmPassword && !isConfirmValid ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-in fade-in-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {confirmPassword.length === 0
                        ? "请再次输入密码以确认"
                        : "两次输入的密码不一致"}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    请再次输入相同的密码以确认无误。
                  </p>
                )}
              </div>

              {/* Buttons (Dual-button pattern from signup-01) */}
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  className="w-full h-9 font-medium gap-2 text-sm"
                  disabled={submitting || (Object.keys(touched).length > 0 && !canSubmit)}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>正在初始化工作空间...</span>
                    </>
                  ) : (
                    <>
                      <span>创建账号并体验</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 gap-1.5 text-xs font-medium hover:bg-muted/60"
                  onClick={handleFillDemoData}
                  disabled={submitting}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>一键填入示例数据 (快速体验)</span>
                </Button>
              </div>

              {/* Footer text inside card */}
              <div className="text-center text-xs text-muted-foreground pt-1">
                已经拥有账号？{" "}
                <Link
                  to="/login"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  直接登录
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
