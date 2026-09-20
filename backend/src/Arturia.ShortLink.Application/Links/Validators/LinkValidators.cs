using Arturia.ShortLink.Application.Links.Dtos;
using FluentValidation;

namespace Arturia.ShortLink.Application.Links.Validators;

public sealed class CreateLinkDtoValidator : AbstractValidator<CreateLinkDto>
{
    public CreateLinkDtoValidator()
    {
        RuleFor(value => value.OriginalUrl)
            .NotEmpty().WithMessage("目标链接不能为空。")
            .MaximumLength(2048).WithMessage("目标链接不能超过 2048 个字符。");
        RuleFor(value => value.Domain)
            .NotEmpty().WithMessage("短链域名不能为空。")
            .MaximumLength(253).WithMessage("短链域名不能超过 253 个字符。");
        RuleFor(value => value.Slug).MaximumLength(32).WithMessage("短链别名不能超过 32 个字符。");
        RuleFor(value => value.Title).MaximumLength(255).WithMessage("标题不能超过 255 个字符。");
        RuleFor(value => value.Description).MaximumLength(512).WithMessage("描述不能超过 512 个字符。");
        RuleFor(value => value.Password).MaximumLength(64).WithMessage("访问密码不能超过 64 个字符。");
    }
}

public sealed class UpdateLinkDtoValidator : AbstractValidator<UpdateLinkDto>
{
    public UpdateLinkDtoValidator()
    {
        RuleFor(value => value.OriginalUrl)
            .NotEmpty().WithMessage("目标链接不能为空。")
            .MaximumLength(2048).WithMessage("目标链接不能超过 2048 个字符。");
        RuleFor(value => value.Title).MaximumLength(255).WithMessage("标题不能超过 255 个字符。");
        RuleFor(value => value.Description).MaximumLength(512).WithMessage("描述不能超过 512 个字符。");
        RuleFor(value => value.Password).MaximumLength(64).WithMessage("访问密码不能超过 64 个字符。");
    }
}

public sealed class BanLinkDtoValidator : AbstractValidator<BanLinkDto>
{
    public BanLinkDtoValidator()
    {
        RuleFor(value => value.Reason).MaximumLength(512).WithMessage("封禁原因不能超过 512 个字符。");
    }
}
