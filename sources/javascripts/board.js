(function () {
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
        var progress = document.getElementById("progress");
        progress.parentNode.style.opacity = 1;
        progress.style.width = '10%';

        var url = credentials.url.replace(/\/+$/, "") + "/api/v3/" + urlPart;

        var r = new XMLHttpRequest();
        r.open("GET", url, true);
        r.setRequestHeader("PRIVATE-TOKEN", credentials.token);
        r.onreadystatechange = function () {
            if (r.readyState >= 4) {
                progress.style.width = '100%';
                progress.parentNode.style.opacity = 0;

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

    function updateProjects() {
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
                    a.href = '#';
                    a.setAttribute('data-project-id', project.id);
                    a.setAttribute('data-project', JSON.stringify(project));
                    a.textContent = project.name_with_namespace;
                    a.onclick = function () {
                        var active = document.querySelector('#project-switch li.active');
                        if (active) {
                            active.className = '';
                        }

                        this.parentNode.className = 'active';
                        localStorage.setItem("GITLAB_PROJECT", this.getAttribute('data-project'));
                        document.getElementById("brand").textContent = this.textContent;
                    };

                    var li = document.createElement('li');
                    li.appendChild(a);
                    ul.appendChild(li);
                });

                var currentProject = localStorage.getItem("GITLAB_PROJECT");
                if (!currentProject) {
                    currentProject = projects[0];
                    localStorage.setItem("GITLAB_PROJECT", JSON.stringify(currentProject));
                } else {
                    currentProject = JSON.parse(currentProject);
                }

                document.querySelector('#project-switch a[data-project-id="{}"]'.replace("{}", currentProject.id))
                    .parentNode.className = 'active';
                document.getElementById("brand").textContent = currentProject.name_with_namespace;
            },
            'projects?per_page=100000'
        );
    }

    function clearIssues() {
        var div = document.getElementById("issues");
        div.innerHTML = "";
    }

    function updateIssues() {
        clearIssues();
        var currentProject = JSON.parse(localStorage.getItem("GITLAB_PROJECT"));

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

        var counter = document.createElement("span");
        counter.className = "counter-container pull-right";
        heading.appendChild(counter);

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

    function renderIssues(currentProject, labelColors, issues) {
        var issueCounters = document.querySelectorAll('.counter-container');
        for (var index=0; index<issueCounters.length; index++) {
            var issueCounter = issueCounters.item(index);
            issueCounter.innerHTML = "";
        }

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

        var issueEpicCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-epic-counter".replace("{}", milestoneId));
        if (!issueEpicCounter) {
            issueEpicCounter = document.createElement("div");
            issueEpicCounter.className = "issue-epic-counter badge hide";
            issueEpicCounter.textContent = "0";
            issueEpicCounter.setAttribute("data-count", "0");

            var container = document.querySelector("[data-milestone-id=\"{}\"] .counter-container".replace("{}", milestoneId));
            container.appendChild(document.createTextNode(" "));
            container.appendChild(issueEpicCounter);
        }

        var issueBugCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-bug-counter".replace("{}", milestoneId));
        if (!issueBugCounter) {
            issueBugCounter = document.createElement("div");
            issueBugCounter.className = "issue-bug-counter badge hide";
            issueBugCounter.textContent = "0";
            issueBugCounter.setAttribute("data-count", "0");

            var container = document.querySelector("[data-milestone-id=\"{}\"] .counter-container".replace("{}", milestoneId));
            container.appendChild(document.createTextNode(" "));
            container.appendChild(issueBugCounter);
        }

        var issueFeatureCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-feature-counter".replace("{}", milestoneId));
        if (!issueFeatureCounter) {
            issueFeatureCounter = document.createElement("div");
            issueFeatureCounter.className = "issue-feature-counter badge hide";
            issueFeatureCounter.textContent = "0";
            issueFeatureCounter.setAttribute("data-count", "0");

            var container = document.querySelector("[data-milestone-id=\"{}\"] .counter-container".replace("{}", milestoneId));
            container.appendChild(document.createTextNode(" "));
            container.appendChild(issueFeatureCounter);
        }

        var issueEnhancementCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-enhancement-counter".replace("{}", milestoneId));
        if (!issueEnhancementCounter) {
            issueEnhancementCounter = document.createElement("div");
            issueEnhancementCounter.className = "issue-enhancement-counter badge hide";
            issueEnhancementCounter.textContent = "0";
            issueEnhancementCounter.setAttribute("data-count", "0");

            var container = document.querySelector("[data-milestone-id=\"{}\"] .counter-container".replace("{}", milestoneId));
            container.appendChild(document.createTextNode(" "));
            container.appendChild(issueEnhancementCounter);
        }

        var issueOthersCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-others-counter".replace("{}", milestoneId));
        if (!issueOthersCounter) {
            issueOthersCounter = document.createElement("div");
            issueOthersCounter.className = "issue-others-counter badge hide";
            issueOthersCounter.textContent = "0";
            issueOthersCounter.setAttribute("data-count", "0");

            var container = document.querySelector("[data-milestone-id=\"{}\"] .counter-container".replace("{}", milestoneId));
            container.appendChild(document.createTextNode(" "));
            container.appendChild(issueOthersCounter);
        }

        var issueTotalCounter = document.querySelector("[data-milestone-id=\"{}\"] .issue-total-counter".replace("{}", milestoneId));
        if (!issueTotalCounter) {
            issueTotalCounter = document.createElement("div");
            issueTotalCounter.className = "issue-total-counter badge";
            issueTotalCounter.textContent = "0";
            issueTotalCounter.setAttribute("data-count", "0");

            var container = document.querySelector("[data-milestone-id=\"{}\"] .counter-container".replace("{}", milestoneId));
            container.appendChild(document.createTextNode(" "));
            container.appendChild(issueTotalCounter);
        }

        if ("closed" != issue.state) {
            if (-1 !== labels.indexOf("epic")) {
                issueEpicCounter.classList.remove("hide");
                issueEpicCounter.innerHTML = "";

                var count = parseInt(issueEpicCounter.getAttribute("data-count")) + 1;
                issueEpicCounter.setAttribute("data-count", count);

                var epicIcon = document.createElement("i");
                epicIcon.className = "fa fa-diamond";

                issueEpicCounter.appendChild(epicIcon);
                issueEpicCounter.appendChild(document.createTextNode(" "));
                issueEpicCounter.appendChild(document.createTextNode(count));
            } else if (-1 !== labels.indexOf("bug")) {
                issueBugCounter.classList.remove("hide");
                issueBugCounter.innerHTML = "";

                var count = parseInt(issueBugCounter.getAttribute("data-count")) + 1;
                issueBugCounter.setAttribute("data-count", count);

                var bugIcon = document.createElement("i");
                bugIcon.className = "fa fa-bug";

                issueBugCounter.appendChild(bugIcon);
                issueBugCounter.appendChild(document.createTextNode(" "));
                issueBugCounter.appendChild(document.createTextNode(count));
            } else if (-1 !== labels.indexOf("feature")) {
                issueFeatureCounter.classList.remove("hide");
                issueFeatureCounter.innerHTML = "";

                var count = parseInt(issueFeatureCounter.getAttribute("data-count")) + 1;
                issueFeatureCounter.setAttribute("data-count", count);

                var featureIcon = document.createElement("i");
                featureIcon.className = "fa fa-plus";
                issueFeatureCounter.appendChild(featureIcon);
                issueFeatureCounter.appendChild(document.createTextNode(" "));
                issueFeatureCounter.appendChild(document.createTextNode(count));
            } else if (-1 !== labels.indexOf("enhancement")) {
                issueEnhancementCounter.classList.remove("hide");
                issueEnhancementCounter.innerHTML = "";

                var count = parseInt(issueEnhancementCounter.getAttribute("data-count")) + 1;
                issueEnhancementCounter.setAttribute("data-count", count);

                var enhancementIcon = document.createElement("i");
                enhancementIcon.className = "fa fa-thumbs-o-up";

                issueEnhancementCounter.appendChild(enhancementIcon);
                issueEnhancementCounter.appendChild(document.createTextNode(" "));
                issueEnhancementCounter.appendChild(document.createTextNode(count));
            } else {
                issueOthersCounter.classList.remove("hide");
                issueOthersCounter.innerHTML = "";

                var count = parseInt(issueOthersCounter.getAttribute("data-count")) + 1;
                issueOthersCounter.setAttribute("data-count", count);

                var warningIcon = document.createElement("i");
                warningIcon.className = "fa fa-warning";

                issueOthersCounter.appendChild(warningIcon);
                issueOthersCounter.appendChild(document.createTextNode(" "));
                issueOthersCounter.appendChild(document.createTextNode(count));
            }

            {
                issueTotalCounter.innerHTML = "";

                var count = parseInt(issueTotalCounter.getAttribute("data-count")) + 1;
                issueTotalCounter.setAttribute("data-count", count);

                var enhancementIcon = document.createElement("i");
                enhancementIcon.className = "fa fa-angle-double-right";
                issueTotalCounter.appendChild(enhancementIcon);
                issueTotalCounter.appendChild(document.createTextNode(" "));
                issueTotalCounter.appendChild(document.createTextNode(count));
            }
        }

        var a = document.createElement("a");
        a.className = "list-group-item";
        a.target = "_blank";
        a.href = credentials.url.replace(/\/+$/, "") + "/" + currentProject.path_with_namespace + "/issues/" + issue.id;
        list.appendChild(a);

        var icon = document.createElement("i");
        icon.className = "fa ";
        if (-1 !== labels.indexOf("epic")) {
            icon.className += "fa-diamond";
        } else if (-1 !== labels.indexOf("bug")) {
            icon.className += "fa-bug";
        } else if (-1 !== labels.indexOf("feature")) {
            icon.className += "fa-plus";
        } else if (-1 !== labels.indexOf("enhancement")) {
            icon.className += "fa-thumbs-o-up";
        } else {
            icon.className += "fa-warning";
        }

        var title = document.createElement("span");
        title.appendChild(icon);
        title.appendChild(document.createTextNode(" "));
        title.appendChild(document.createTextNode(issue.title));
        a.appendChild(title);

        if ("closed" == issue.state) {
            a.className += " closed";
        }

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
            updateProjects();
            updateIssues();
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
        updateIssues();
    };

    document.addEventListener("DOMContentLoaded", connect);
})();
