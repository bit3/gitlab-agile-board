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
                        updateIssues();
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

                updateIssues();
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
        issues.forEach(function(issue) {
            renderIssue(currentProject, labelColors, issue);
        })
    }

    function renderIssue(currentProject, labelColors, issue) {
        var credentials = requireCredentials();
        var labels = issue.labels || [];

        var list;
        if (issue.milestone) {
            list = document.querySelector("[data-milestone-id=\"{}\"] .list-group".replace("{}", issue.milestone.id));

            if (!list) {
                return;
            }
        } else if ("closed" == issue.state) {
            return;
        } else {
            list = document.querySelector("[data-milestone-id=\"backlog\"] .list-group");
        }

        var a = document.createElement("a");
        a.className = "list-group-item";
        a.target = "_blank";
        a.href = credentials.url.replace(/\/+$/, "") + "/" + currentProject.path_with_namespace + "/issues/" + issue.id;
        list.appendChild(a);

        var icon = document.createElement("i");
        icon.className = "fa ";
        if (-1 !== labels.indexOf("bug")) {
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
            title.className += " text-muted";
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
