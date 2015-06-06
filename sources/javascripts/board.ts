/// <reference path="adapter/GitlabAdapter.ts" />
/// <reference path="adapter/IssueTypeResolver.ts" />
/// <reference path="model/Issue.ts" />
/// <reference path="model/IssueType.ts" />
/// <reference path="native/String.ts" />
/// <reference path="ui/Progress.ts" />

var issueTypeMapping = {
    "epic": new Model.IssueType("epic", "Epic"),
    "bug": new Model.IssueType("bug", "Bug"),
    "feature": new Model.IssueType("feature", "Feature"),
    "enhancement": new Model.IssueType("enhancement", "Enhancement"),
    "documentation": new Model.IssueType("documentation", "Documentation"),
    "*": new Model.IssueType("unknown", "Unknown")
};

var issueTypeResolver = new Adapter.LabelBasedIssueTypeResolver(issueTypeMapping);
var credentials = new Adapter.GitlabCredentials();
