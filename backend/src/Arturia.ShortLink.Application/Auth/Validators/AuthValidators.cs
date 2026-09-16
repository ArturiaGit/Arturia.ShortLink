using Arturia.ShortLink.Application.Auth.Dtos;
using FluentValidation;

namespace Arturia.ShortLink.Application.Auth.Validators;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(value => value.Email).NotEmpty().EmailAddress().MaximumLength(128);
        RuleFor(value => value.Password).NotEmpty().MaximumLength(64);
    }
}

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(value => value.Email).NotEmpty().EmailAddress().MaximumLength(128);
        RuleFor(value => value.Password).NotEmpty().Length(8, 64)
            .Matches("[a-z]").WithMessage("密码必须包含小写字母。")
            .Matches("[A-Z]").WithMessage("密码必须包含大写字母。")
            .Matches("[0-9]").WithMessage("密码必须包含数字。");
        RuleFor(value => value.Nickname).NotEmpty().MaximumLength(32);
    }
}
