(function () {
    var progressHideTimeout;
    var currentProject = null;
    var labels = null;

    function requireCredentials() {
        var url = localStorage.getItem("GITLAB_URL");
        var token = localStorage.getItem("GITLAB_TOKEN");

        if (!url || !token) {
            showLogin();
            throw "Not authenticated";
        }

        return {url: url, token: token};
    }

    function query(callback, urlPart, parameters) {
        var credentials = requireCredentials();

        clearTimeout(progressHideTimeout);
        var progress = document.getElementById("progress");
        progress.style.width = '10%';
        progress.parentNode.style.visibility = "visible";

        var url = credentials.url.replace(/\/+$/, "") + "/api/v3/" + urlPart;

        var r = new XMLHttpRequest();
        r.open("GET", url, true);
        r.setRequestHeader("PRIVATE-TOKEN", credentials.token);
        r.onreadystatechange = function () {
            if (r.readyState >= 4) {
                progress.style.width = '100%';

                progressHideTimeout = setTimeout(function() {
                    progress.style.width = '0%';
                    progress.parentNode.style.visibility = "hidden";
                }, 1000);

                if (r.status != 200) return;
                callback(JSON.parse(r.responseText));
            } else if (r.readyState >= 3) {
                progress.style.width = '80%';
            } else if (r.readyState >= 2) {
                progress.style.width = '60%';
            } else if (r.readyState >= 1) {
                progress.style.width = '40%';
            } else if (r.readyState >= 0) {
                progress.style.width = '20%';
            }
        };
        r.send(parameters);
    }

    function clearProjectList() {
        var ul = document.getElementById('project-switch');
        ul.innerHTML = "";
    }

    function updateProjects(callback) {
        query(
            function (projects) {
                clearProjectList();

                var ul = document.getElementById('project-switch');

                projects.sort(function (a, b) {
                    return a.name_with_namespace.localeCompare(b.name_with_namespace);
                });

                var projectIdTitle = {};
                var namespace = null;
                projects.forEach(function (project) {
                    projectIdTitle[project.id] = project.name_with_namespace;

                    if (null === namespace) {
                        namespace = project.namespace.name;
                    } else if (namespace != project.namespace.name) {
                        var li = document.createElement('li');
                        li.className = 'divider';
                        li.textContent = project.namespace.name;
                        ul.appendChild(li);

                        namespace = project.namespace.name;
                    }

                    var a = document.createElement('a');
                    a.href = '#' + project.id;
                    a.setAttribute('data-project-id', project.id);
                    a.setAttribute('data-project', JSON.stringify(project));
                    a.textContent = project.name_with_namespace;

                    var li = document.createElement('li');
                    li.appendChild(a);
                    ul.appendChild(li);
                });

                callback();
            },
            'projects?per_page=100000'
        );
    }

    function updateProject() {
        var projectId = parseInt(location.hash.substring(1));

        var active = document.querySelector('#project-switch li.active');
        if (active) {
            active.className = '';
        }

        document.getElementById("brand").textContent = "gitlab agile board";

        if (!projectId || projectId <= 0) {
            return;
        }

        query(
            function (project) {
                currentProject = project;

                document.querySelector('#project-switch a[data-project-id="{}"]'.replace("{}", currentProject.id))
                    .parentNode.className = 'active';
                document.getElementById("brand").textContent = currentProject.name_with_namespace;

                query(
                    function (labels) {
                        var labelColors = {};
                        labels.forEach(function (label) {
                            labelColors[label.name] = label.color;
                        });

                        query(
                            function (milestones) {
                                milestones.sort(function (a, b) {
                                    if (a.due_date && !b.due_date) {
                                        return -1;
                                    }
                                    if (!a.due_date && b.due_date) {
                                        return 1;
                                    }
                                    if (a.due_date && b.due_date) {
                                        a = new Date(a.due_date);
                                        b = new Date(b.due_date);

                                        return a.getTime() - b.getTime();
                                    }
                                    return a.title.localeCompare(b.title);
                                });

                                query(
                                    function (issues) {
                                        clearIssues();

                                        renderMilestones(currentProject, milestones);
                                        renderIssues(currentProject, labelColors, issues);
                                    },
                                    "projects/{}/issues?per_page=100000".replace("{}", currentProject.id)
                                );
                            },
                            "projects/{}/milestones?per_page=100000".replace("{}", currentProject.id)
                        );
                    },
                    "projects/{}/labels?per_page=100000".replace("{}", currentProject.id)
                );
            },
            "projects/{}".replace("{}", projectId)
        );
    }

    function clearIssues() {
        var div = document.getElementById("issues");
        div.innerHTML = "";
    }

    function renderMilestones(currentProject, milestones) {
        milestones.forEach(function(milestone) {
            renderMilestone(currentProject, milestone);
        });
        renderMilestone(currentProject, {
            id: "backlog",
            title: "Backlog",
            due_date: false,
            state: "active"
        });
    }

    function renderMilestone(currentProject, milestone) {
        if ("active" != milestone.state) {
            return;
        }

        var credentials = requireCredentials();
        var dueDate = milestone.due_date ? new Date(milestone.due_date) : false;

        var panel = document.createElement("div");
        panel.className = "panel";
        if (!dueDate) {
            panel.className += " panel-default";
        } else if (dueDate > new Date()) {
            panel.className += " panel-info";
        } else {
            panel.className += " panel-danger";
        }
        panel.setAttribute('data-milestone-id', milestone.id);
        panel.setAttribute('data-milestone', JSON.stringify(milestone));

        var headingLink;
        if ("backlog" == milestone.id) {
            headingLink = document.createElement("em");
            headingLink.textContent = milestone.title;
        } else {
            headingLink = document.createElement("a");
            headingLink.target = "_blank";
            headingLink.href = credentials.url.replace(/\/+$/, "") + "/" + currentProject.path_with_namespace + "/milestones/" + milestone.id;
            headingLink.textContent = milestone.title;
        }

        var heading = document.createElement("div");
        heading.className = "panel-heading";
        heading.appendChild(headingLink);
        panel.appendChild(heading);

        if (dueDate) {
            var label = document.createElement("label");
            label.className = "label label-default";
            label.textContent = dueDate.toLocaleDateString();
            heading.appendChild(document.createTextNode(" "));
            heading.appendChild(label);
        }

        var counterContainer = document.createElement("span");
        counterContainer.className = "counter-container pull-right";
        heading.appendChild(counterContainer);

        renderCounter("epic", "diamond", counterContainer);
        renderCounter("bug", "bug", counterContainer);
        renderCounter("feature", "plus", counterContainer);
        renderCounter("enhancement", "thumbs-o-up", counterContainer);
        renderCounter("others", "warning", counterContainer);
        renderCounter("total", "angle-double-right", counterContainer);

        if (milestone.description) {
            var body = document.createElement("div");
            body.className = "panel-body";
            body.textContent = milestone.description;
            panel.appendChild(body);
        }

        var list = document.createElement("div");
        list.className = "list-group";
        panel.appendChild(list);

        document.getElementById("issues").appendChild(panel);
    }

    function renderCounter(type, icon, container) {
        var counter = document.createElement("div");
        counter.className = "issue-{}-counter badge hide".replace("{}", type);

        var fa = document.createElement("i");
        fa.className = "fa fa-{}".replace("{}", icon);

        var count = document.createElement("span");
        count.className = "count";
        count.textContent = "0";

        counter.appendChild(fa);
        counter.appendChild(document.createTextNode(" "));
        counter.appendChild(count);

        container.appendChild(document.createTextNode(" "));
        container.appendChild(counter);
    }

    function renderIssues(currentProject, labelColors, issues) {
        issues.forEach(function(issue) {
            renderIssue(currentProject, labelColors, issue);
        })
    }

    function renderIssue(currentProject, labelColors, issue) {
        var credentials = requireCredentials();
        var labels = issue.labels || [];

        var milestoneId = false;
        if (issue.milestone) {
            milestoneId = issue.milestone.id;
        } else if ("closed" == issue.state) {
            return;
        } else {
            milestoneId = "backlog";
        }

        var list = document.querySelector("[data-milestone-id=\"{}\"] .list-group".replace("{}", milestoneId));

        if (!list) {
            return;
        }

        var issueEpicCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-epic-counter .count".replace("{}", milestoneId));
        var issueBugCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-bug-counter .count".replace("{}", milestoneId));
        var issueFeatureCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-feature-counter .count".replace("{}", milestoneId));
        var issueEnhancementCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-enhancement-counter .count".replace("{}", milestoneId));
        var issueOthersCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-others-counter .count".replace("{}", milestoneId));
        var issueTotalCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-total-counter .count".replace("{}", milestoneId));

        if ("closed" != issue.state) {
            if (-1 !== labels.indexOf("epic")) {
                issueEpicCounter.parentNode.classList.remove("hide");
                issueEpicCounter.textContent = parseInt(issueEpicCounter.textContent) + 1;
            } else if (-1 !== labels.indexOf("bug")) {
                issueBugCounter.parentNode.classList.remove("hide");
                issueBugCounter.textContent = parseInt(issueBugCounter.textContent) + 1;
            } else if (-1 !== labels.indexOf("feature")) {
                issueFeatureCounter.parentNode.classList.remove("hide");
                issueFeatureCounter.textContent = parseInt(issueFeatureCounter.textContent) + 1;
            } else if (-1 !== labels.indexOf("enhancement")) {
                issueEnhancementCounter.parentNode.classList.remove("hide");
                issueEnhancementCounter.textContent = parseInt(issueEnhancementCounter.textContent) + 1;
            } else {
                issueOthersCounter.parentNode.classList.remove("hide");
                issueOthersCounter.textContent = parseInt(issueOthersCounter.textContent) + 1;
            }

            issueTotalCounter.parentNode.classList.remove("hide");
            issueTotalCounter.textContent = parseInt(issueTotalCounter.textContent) + 1;
        }

        var a = document.createElement("a");
        a.className = "list-group-item";
        a.target = "_blank";
        a.href = credentials.url.replace(/\/+$/, "") + "/" + currentProject.path_with_namespace + "/issues/" + issue.id;
        list.appendChild(a);

        var priorityIcon = document.createElement("i");
        priorityIcon.className = "fa fa-fw ";
        if (-1 !== labels.indexOf("critical")) {
            priorityIcon.className += "fa-arrow-circle-up text-danger";
        } else if (-1 !== labels.indexOf("high")) {
            priorityIcon.className += "fa-chevron-circle-up text-warning";
        } else if (-1 !== labels.indexOf("low")) {
            priorityIcon.className += "fa-chevron-circle-down text-info";
        } else if (-1 !== labels.indexOf("trivial")) {
            priorityIcon.className += "fa-arrow-circle-down text-success";
        } else {
            priorityIcon.className += "fa-chevron-circle-right text-primary";
        }

        var typeIcon = document.createElement("i");
        typeIcon.className = "fa fa-fw ";
        if (-1 !== labels.indexOf("epic")) {
            typeIcon.className += "fa-diamond text-primary";
        } else if (-1 !== labels.indexOf("bug")) {
            typeIcon.className += "fa-bug text-danger";
        } else if (-1 !== labels.indexOf("feature")) {
            typeIcon.className += "fa-plus text-success";
        } else if (-1 !== labels.indexOf("enhancement")) {
            typeIcon.className += "fa-thumbs-o-up text-info";
        } else if (-1 !== labels.indexOf("documentation")) {
            typeIcon.className += "fa-book text-muted";
        } else {
            typeIcon.className += "fa-warning text-warning";
        }

        var title = document.createElement("span");
        title.appendChild(priorityIcon);
        title.appendChild(document.createTextNode(" "));
        title.appendChild(typeIcon);
        title.appendChild(document.createTextNode(" "));
        title.appendChild(document.createTextNode(issue.title));
        a.appendChild(title);

        if ("closed" == issue.state) {
            a.className += " closed";
        }

        /*
        if (-1 !== labels.indexOf("epic")) {
            title.className += " text-primary";
        } else if (-1 !== labels.indexOf("bug")) {
            title.className += " text-danger";
        } else if (-1 !== labels.indexOf("feature")) {
            title.className += " text-success";
        } else if (-1 !== labels.indexOf("enhancement")) {
            title.className += " text-info";
        } else {
            title.className += " text-warning";
        }
        */

        labels.forEach(function(label) {
            var span = document.createElement("span");
            span.className = "label label-default";
            span.textContent = label;

            if (labelColors[label]) {
                span.style.backgroundColor = labelColors[label];
            }

            a.appendChild(document.createTextNode(" "));
            a.appendChild(span);
        });

        if (issue.assignee) {
            var assignee = issue.assignee;
            var span = document.createElement("span");
            span.className = "pull-right";

            if (assignee.avatar_url) {
                var avatar = document.createElement("img");
                avatar.src = assignee.avatar_url;
                avatar.className = "img-circle";
                avatar.style.width = "20px";
                avatar.style.height = "20px";

                span.appendChild(avatar);
                span.appendChild(document.createTextNode(" "));
            }

            span.appendChild(document.createTextNode(assignee.name || assignee.username));

            a.appendChild(document.createTextNode(" "));
            a.appendChild(span);
        }
    }

    function connect() {
        try {
            requireCredentials();
            hideLogin();
            updateProjects(updateProject);
        } catch (e) {
            showLogin();
        }
    }

    function showLogin() {
        $(document.getElementById('login-modal')).modal('show');
    }

    function hideLogin() {
        $(document.getElementById('login-modal')).modal('hide');
    }

    window.login = function () {
        var url = this.elements.url.value;
        var token = this.elements.token.value;

        localStorage.setItem("GITLAB_URL", url);
        localStorage.setItem("GITLAB_TOKEN", token);

        connect();
    };

    window.logout = function () {
        localStorage.removeItem("GITLAB_URL");
        localStorage.removeItem("GITLAB_TOKEN");
        document.getElementById("brand").textContent = "gitlab agile board";
        clearProjectList();
        clearIssues();
        showLogin();
    };

    window.refresh = function () {
        updateProject();
    };

    window.addEventListener("hashchange", updateProject);

    document.addEventListener("DOMContentLoaded", connect);
})();
