using Arturia.ShortLink.Application.Workspaces.Dtos;
using FluentValidation;

namespace Arturia.ShortLink.Application.Workspaces.Validators;

public sealed class CreateWorkspaceDtoValidator : AbstractValidator<CreateWorkspaceDto>
{
    public CreateWorkspaceDtoValidator()
    {
        RuleFor(value => value.Name).NotEmpty().Length(2, 32);
        RuleFor(value => value.Slug).NotEmpty().Matches("^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$");
    }
}

public sealed class InviteMemberRequestValidator : AbstractValidator<InviteMemberRequest>
{
    public InviteMemberRequestValidator()
    {
        RuleFor(value => value.Email).NotEmpty().EmailAddress().MaximumLength(128);
        RuleFor(value => value.Role).Must(value => value is "admin" or "member").WithMessage("角色只能是 admin 或 member。");
    }
}

public sealed class UpdateMemberRoleRequestValidator : AbstractValidator<UpdateMemberRoleRequest>
{
    public UpdateMemberRoleRequestValidator() =>
        RuleFor(value => value.Role).Must(value => value is "admin" or "member").WithMessage("角色只能是 admin 或 member。");
}
