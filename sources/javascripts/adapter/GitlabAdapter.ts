/// <reference path="AdapterException.ts" />
/// <reference path="IssueTypeResolver.ts" />
/// <reference path="../model/Issue.ts" />
/// <reference path="../model/IssueType.ts" />
/// <reference path="../model/Label.ts" />
/// <reference path="../model/Milestone.ts" />
/// <reference path="../model/Project.ts" />
/// <reference path="../native/String.ts" />
/// <reference path="../ui/Progress.ts" />

module Adapter {
    export interface GitlabCredentials {
        url: string;
        token: string;

        constructor(public url:string, public token:string);
    }

    export interface GitlabFetchProjectsCallback {
        (projects:Model.Project[]): void;
    }

    export interface GitlabFetchLabelsCallback {
        (labels:Model.Label[]): void;
    }

    export interface GitlabFetchMilestonesCallback {
        (milestones:Model.Milestone[]): void;
    }

    export interface GitlabFetchIssuesCallback {
        (issues:Model.Issue[]): void;
    }

    interface GitlabAvatar {
        url: string;
    }

    interface GitlabNamespace {
        id: number;
        name: string;
        path: string;
        owner_id: number;
        created_at: Date;
        updated_at: Date;
        description: string;
        avatar:GitlabAvatar;
    }

    interface GitlabProject {
        id: number;
        description: string;
        default_branch: string;
        tag_list: string[];
        public: boolean;
        archived: boolean;
        visibility_level: number;
        ssh_url_to_repo: string;
        http_url_to_repo: string;
        web_url: string;
        name: string;
        name_with_namespace: string;
        path: string;
        path_with_namespace: string;
        issues_enabled: boolean;
        merge_requests_enabled: boolean;
        wiki_enabled: boolean;
        snippets_enabled: boolean;
        created_at: string;
        last_activity_at: string;
        creator_id: number;
        namespace: GitlabNamespace;
        avatar_url: string;
    }

    interface GitlabLabel {
        name: string;
        color: string;
    }

    export class GitlabAdapter {
        credentials:GitlabCredentials;
        issueTypeResolver:IssueTypeResolver;
        progress:UI.Progress;

        constructor(credentials:GitlabCredentials, issueTypeResolver:IssueTypeResolver, progress:UI.Progress) {
            this.credentials = credentials;
            this.issueTypeResolver = issueTypeResolver;
            this.progress = progress;
        }

        private query(callback:any, urlPart:string, label:string) {
            this.progress.progress(label);

            var self = this;
            var url = this.credentials.url.replace(/\/+$/, "") + "/api/v3/" + urlPart;
            var request = new XMLHttpRequest();

            request.open("GET", url, true);
            request.setRequestHeader("PRIVATE-TOKEN", this.credentials.token);
            request.onreadystatechange = function () {
                if (request.readyState >= 4) {
                    self.progress.hide();
                    if (request.status != 200) return;
                    callback(JSON.parse(request.responseText));
                }
            };
            request.send();
        }

        private queryProjects(callback:any, allProjects:Model.Project[], page:number) {
            var self = this;

            this.query(
                function (receivedProjects:GitlabProject[]) {
                    if (!receivedProjects.length) {
                        callback(allProjects);
                        return;
                    }

                    receivedProjects.forEach(function (receivedProject:GitlabProject) {
                        var project = new Model.Project(
                            receivedProject.id,
                            receivedProject.name_with_namespace,
                            receivedProject.web_url
                        );
                        project.defaultBranch = receivedProject.default_branch;
                        allProjects.push(project)
                    });

                    self.queryProjects(callback, allProjects, page + 1);
                },
                "projects?per_page=1000&page={0}".format(page),
                "fetching projects (page " + page + ")"
            );
        }

        private queryLabels(project:Model.Project, callback:any, allLabels:Model.Label[]) {
            this.query(
                function (receivedLabels:GitlabLabel[]) {
                    receivedLabels.forEach(function(receivedLabel:GitlabLabel) {
                        allLabels.push(new Model.Label(receivedLabel.name, receivedLabel.color))
                    });

                    callback(allLabels);
                },
                "projects/{0}/labels".format(project.id),
                "fetching labels"
            );
        }

        private queryMilestones(project:Model.Project, callback:any, allMilestones:Model.Milestone[], page:number) {
            var self = this;

            this.query(
                function (milestones) {
                    if (!milestones.length) {
                        callback(allMilestones);
                        return;
                    }

                    if (allMilestones) {
                        allMilestones = allMilestones.concat(milestones);
                    } else {
                        allMilestones = milestones;
                    }

                    self.queryMilestones(project, callback, allMilestones, page + 1);
                },
                "projects/{0}/milestones?per_page=1000&page={1}".format(project.id, page),
                "fetching milestones (page " + page + ")"
            );
        }

        private queryIssues(project:Model.Project, callback:any, allIssues:Model.Issue[], page:number) {
            var self = this;

            this.query(
                function (issues) {
                    if (!issues.length) {
                        callback(allIssues);
                        return;
                    }

                    if (allIssues) {
                        allIssues = allIssues.concat(issues);
                    } else {
                        allIssues = issues;
                    }

                    self.queryIssues(project, callback, allIssues, page + 1);
                },
                "projects/{0}/issues?per_page=1000&page={1}".format(project.id, page),
                "fetching issues (page " + page + ")"
            );
        }

        fetchProjects(callback:GitlabFetchProjectsCallback) {
            this.progress.show("fetching projects");
            this.queryProjects(callback, [], 1);
        }

        fetchLabels(project:Model.Project, callback:GitlabFetchLabelsCallback) {
            this.progress.show("fetching labels");
            this.queryLabels(project, callback, []);
        }

        fetchMilestones(project:Model.Project, callback:GitlabFetchMilestonesCallback) {
            this.progress.show("fetching milestones");
            this.queryMilestones(project, callback, [], 1);
        }

        fetchIssues(project:Model.Project, callback:GitlabFetchIssuesCallback) {
            this.progress.show("fetching issues");
            this.queryIssues(project, callback, [], 1);
        }
    }
}
