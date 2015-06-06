/// <reference path="../model/Issue.ts" />
/// <reference path="../model/IssueType.ts" />

module Adapter {
    export interface IssueTypeResolver {
        resolveType(issue: Model.Issue): Model.IssueType;
    }

    export interface LabelIssueMap {
        [index: string]: Model.IssueType;
    }

    export class LabelBasedIssueTypeResolver implements IssueTypeResolver {
        mappings: LabelIssueMap;

        constructor(mappings: LabelIssueMap) {
            this.mappings = mappings;
        }

        resolveType(issue:Model.Issue):Model.IssueType {
            return undefined;
        }
    }
}
