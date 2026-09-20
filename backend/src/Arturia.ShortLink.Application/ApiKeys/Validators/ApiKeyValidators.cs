using Arturia.ShortLink.Application.ApiKeys.Dtos;
using FluentValidation;

namespace Arturia.ShortLink.Application.ApiKeys.Validators;

public sealed class CreateApiKeyDtoValidator : AbstractValidator<CreateApiKeyDto>
{
    public CreateApiKeyDtoValidator()
    {
        RuleFor(value => value.Name)
            .NotEmpty().WithMessage("密钥名称不能为空。")
            .MaximumLength(64).WithMessage("密钥名称不能超过 64 个字符。");
    }
}
