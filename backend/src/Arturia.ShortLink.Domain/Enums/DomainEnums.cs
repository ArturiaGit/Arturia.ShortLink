namespace Arturia.ShortLink.Domain.Enums;

public enum WorkspaceRole { Owner, Admin, Member }
public enum InvitationRole { Admin, Member }
public enum InvitationStatus { Pending, Accepted, Expired, Revoked }
public enum PlanTier { Free, Pro, Enterprise }
public enum SslStatus { Active, Pending, Error }
public enum RiskRuleType { BlockedProtocol, BlockedDomain, BlockedKeyword, ReservedSlug, BotUserAgent }
public enum RiskMatchType { Exact, Suffix, Contains, Regex }
