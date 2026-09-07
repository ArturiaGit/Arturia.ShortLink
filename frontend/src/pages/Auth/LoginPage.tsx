import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Link2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login, fillDemoAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordProvided = password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedEmail(true);

    if (!isEmailValid || !isPasswordProvided) return;

    setSubmitting(true);
    const success = await login(email.trim(), password);
    setSubmitting(false);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  const handleDemoLogin = async (role: "admin" | "member") => {
    setTouchedEmail(false);
    setSubmitting(true);
    const success = await fillDemoAccount(role);
    setSubmitting(false);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-50/50 p-4 sm:p-6 lg:p-8 animate-in fade-in-0 duration-300">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 text-white shadow-md">
            <Link2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Arturia.ShortLink
          </h1>
          <p className="text-sm text-muted-foreground">
            企业级多租户短链 SaaS 运营与分析平台
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">登录控制台</h2>
            <p className="text-xs text-muted-foreground mt-1">
              请输入您的注册邮箱与密码进入工作空间
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                工作邮箱
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouchedEmail(true)}
                required
                disabled={submitting}
                className={
                  touchedEmail && email.length > 0 && !isEmailValid
                    ? "border-destructive focus-visible:ring-destructive h-10"
                    : "h-10"
                }
              />
              {touchedEmail && email.length > 0 && !isEmailValid && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1 animate-in fade-in-0">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>请输入有效的电子邮箱格式 (如 user@company.com)</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  登录密码
                </Label>
                <span className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  忘记密码?
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className="h-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "隐藏密码" : "显示密码"}
                  </span>
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 gap-2 font-medium mt-2"
              disabled={submitting || (touchedEmail && !isEmailValid)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在验证...</span>
                </>
              ) : (
                <>
                  <span>立即登录</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Fill Section */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">
                快速体验 / 演示账号
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs border-dashed justify-start px-3 hover:bg-muted/60"
              onClick={() => handleDemoLogin("admin")}
              disabled={submitting}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <div className="flex flex-col items-start truncate">
                <span className="font-medium text-foreground">超级管理员</span>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs border-dashed justify-start px-3 hover:bg-muted/60"
              onClick={() => handleDemoLogin("member")}
              disabled={submitting}
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <div className="flex flex-col items-start truncate">
                <span className="font-medium text-foreground">普通协作者</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-muted-foreground">
          还没有账号？{" "}
          <Link
            to="/register"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            免费注册并创建工作空间
          </Link>
        </div>
      </div>
    </div>
  );
};
