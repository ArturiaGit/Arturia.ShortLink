import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, ArrowRight, Loader2 } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !email.trim()) return;

    setSubmitting(true);
    const success = await register(nickname.trim(), email.trim(), password);
    setSubmitting(false);
    if (success) {
      navigate("/", { replace: true });
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
            加入 Arturia.ShortLink
          </h1>
          <p className="text-sm text-muted-foreground">
            创建新账号并建立您的首个独立工作空间
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">注册企业账号</h2>
            <p className="text-xs text-muted-foreground mt-1">
              完成注册后系统将自动为您配置专属团队空间
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">团队或个人昵称</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="例如：极客增长团队"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                disabled={submitting}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">工作邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">设置密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 8 位包含字母和数字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 gap-2 font-medium"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在创建工作空间...</span>
                </>
              ) : (
                <>
                  <span>创建账号并体验</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-muted-foreground">
          已经拥有账号？{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            直接登录
          </Link>
        </div>
      </div>
    </div>
  );
};
