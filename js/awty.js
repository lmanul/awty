//
// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.KeyHandler');
goog.require('goog.net.XhrIo')
goog.require('goog.positioning.Corner');
goog.require('goog.string')
goog.require('goog.style');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.PopupMenu');
goog.require('goog.Uri');

goog.require('awty.ChartMaker');
goog.require('awty.DataStore');
goog.require('awty.Util');

goog.provide('awty');

/** A separate object to store our local data. */
awty.dataStore;

/**
 * Tracks which entities are expanded and collapsed.
 */
awty.expandState = {};

/**
 * Tracks whether we're currently editing so that we don't autorefresh and
 * lose the user's data.
 */
awty.isCurrentlyEditing = false;

/**
 * Tracks whether we've rendered the current page at least once. Used for the
 * "Completed" section which we don't re-render.
 */
awty.renderedAtLeastOnce = false;

/**
 * The time between two auto-refreshes. Five minutes.
 * @type {number}
 */
// Disable auto-refresh for now.
// awty.refreshInterval = 5 * 60 * 1000;

/**
 * The type of the page currently being rendered.
 * @type {awty.PageType}
 */
awty.currentPageType;

// Cache the elements currently being edited in order to be able to swap one
// for the other when cancelling the edit.
awty.staticElementCurrentlyEdited;
awty.editableElementCurretnlyEdited;

/**
 * The various page types we're able to render.
 * @type {Object.<string>}
 */
awty.PageType = {
  ORGANIZE: 'organize',
  MILESTONE: 'milestone',
  DASHBOARD: 'dashboard',
  PROGRESS: 'progress'
};

/**
 * The available progress bar sizes.
 * @type {Object.<string>}
 */
awty.ProgressBarSize = {
  SMALL: 'smallpb',
  MEDIUM: 'mediumpb',
  LARGE: 'largepb'
}

/**
 * The various entity types we support.
 * @type {Object.<string>}
 */
awty.EntityType = {
  SUBPROJECT: 'subproject',
  FEATURE: 'feature',
  TASK: 'task'
};

/**
 * Characters allowed in a random code.
 * @type {Array.<string>}
 */
awty.CHARS_FOR_CODES = 'abcdefghiklmnopqrstuvwxyz'.split('');


/**
 * The CSS class assigned to entities that should be editable in line.
 */
awty.EDITABLE_CLASS = 'editable';


/**
 * Properties for a sub-project entity.
 * @type {Object.<Array.<string>>}
 */
awty.subprojectProperties = [
  {'name': 'code', 'label': 'code', 'hidden': true},
  {'name': 'title', 'label': 'Sub-project Title', size: '30'},
  {'name': 'admins', 'label': 'admins LDAPs'},
  {'name': 'projectCode', 'label': 'Project Code', 'hidden': true}
];


/**
 * Properties for a feature entity.
 * @type {Object.<Array.<string>>}
 */
awty.featureProperties = [
  {'name': 'subprojectCode', 'label': 'Sub-project Code', size: '4',
      'hidden': true},
  {'name': 'code', 'label': 'code', 'hidden': true},
  {'name': 'title', 'label': 'Feature Title', size: '30'},
  // Not used for now.
  //{'name': 'bugNumber', 'label': 'Bug ID', size: '8'},
  //{'name': 'notes', 'label': 'Notes', size: '20'},
  {'name': 'owner', 'label': 'Owner LDAP'},
  {'name': 'tags', 'label': 'Comma-separated Tags', size: '30'}
];


/**
 * Properties for a task entity.
 * @type {Object.<Array.<string>>}
 */
awty.taskProperties = [
  {'name': 'featureCode', 'label': 'Feature Code', size: '4', 'hidden': true},
  {'name': 'code', 'label': 'code', 'hidden': true},
  {'name': 'actualTime', 'label': 'Actual time spent (days)', size: '2'},
  {'name': 'currentEstimatedTime', 'label': 'Cur. Estimate (days)', size: '2'},
  {'name': 'originalEstimatedTime', 'label': 'Orig. Estimate (days)', size: '2'},
  {'name': 'title', 'label': 'Task Title', size: '46'},
  {'name': 'owner', 'label': 'Owner', size: '10'},
  {'name': 'bugNumber', 'label': 'Bug #', size: '8'}
  // Not used for now.
  //{'name': 'notes', 'label': 'Notes', size: '30'},
  //{'name': 'active', 'label': 'Active', 'isBoolean': true}
];


/**
 * Initializes our basic data structures and event listeners.
 */
awty.init = function() {
  awty.dataStore = new awty.DataStore();
  var anchor = document.getElementById('milestones_menu_anchor');
  var menu = new goog.ui.PopupMenu();
  menu.setToggleMode(true);
  var milestonesMenuElement = document.getElementById('milestones_menu');
  if (milestonesMenuElement) {
    menu.decorate(milestonesMenuElement);
    menu.attach(
        anchor,
        goog.positioning.Corner.BOTTOM_LEFT,
        goog.positioning.Corner.TOP_LEFT);
  }
  goog.events.listen(document.body, 'click', awty.onCanvasClick);
};


/**
 * Refreshes the data from the server.
 */
awty.refreshData = function() {
  awty.getData(awty.currentPageType);
  // Disable auto-refresh for now.
  // window.setTimeout(awty.refreshData, awty.refreshInterval);
};


/** */
awty.isEditableContentElement = function(element) {
  return ((event.target.type && event.target.type.toLowerCase() == 'text') ||
      (event.target.type && event.target.type.toLowerCase() == 'checkbox') ||
      (event.target.tagName && event.target.tagName.toLowerCase() == 'img') ||
      (event.target.tagName && event.target.tagName.toLowerCase() == 'button'));
};


/**
 * Callback for a click anywhere in the page's body.
 */
awty.onCanvasClick = function(e) {
  var event = e || window.event;
  if (awty.isCurrentlyEditing &&
      !awty.isEditableContentElement(event.target)) {
    awty.cancelCurrentEdit();
  }
};


/**
 * Cancels the ongoing edit action and restores the previous state of the
 * entity being edited.
 */
awty.cancelCurrentEdit = function(e) {
  var event = e || window.event;
  event.stopPropagation();
  if (awty.staticElementCurrentlyEdited) {
    goog.dom.replaceNode(awty.staticElementCurrentlyEdited,
        awty.edtiableElementCurrentlyEdited);
  }
  awty.staticElementCurrentlyEdited = null;
  awty.edtiableElementCurrentlyEdited = null;
  awty.isCurrentlyEditing = false;
};


/** */
awty.onMilestoneBodyLoaded = function() {
  awty.init();
  awty.currentPageType = awty.PageType.MILESTONE;
  awty.refreshData();
};

/** */
awty.onOrganizeBodyLoaded = function() {
  awty.init();
  awty.currentPageType = awty.PageType.ORGANIZE;
  awty.refreshData();
};

/** */
awty.onDashboardBodyLoaded = function() {
  awty.init();
  awty.currentPageType = awty.PageType.DASHBOARD;
  awty.refreshData();
};

/** */
awty.onProgressBodyLoaded = function() {
  awty.init();
  awty.currentPageType = awty.PageType.PROGRESS;
  awty.refreshData();
};

/** */
awty.onHomeBodyLoaded = function() {
  awty.init();
};

/** */
awty.onSnapshotChoiceChanged = function() {
  awty.refreshData();
};

/** */
awty.sortEntities = function(a, b) {
  // TODO(manucornet): Also sort by what's active.
  // Otherwise sort by title.
  if (a.title && b.title) {
    return a.title > b.title;
  }
  // Last resort, sort by code.
  return a.code > b.code;
};


/** Sort by time spent. */
awty.sortProgressItems = function(a, b) {
  return parseFloat(a[2]) < parseFloat(b[2]);
};

awty.getData = function(pageType) {
  awty.getWhoAmI();

  var urlSuffix;
  switch(pageType) {
    case awty.PageType.ORGANIZE:
      urlSuffix = '/organizedata';
      break;
    case awty.PageType.PROGRESS:
      var snapshotSelect = document.getElementById('snapshot_select');
      var selectedSnapshotCode =
          snapshotSelect.options[snapshotSelect.selectedIndex].value;
      urlSuffix = 'data/' + selectedSnapshotCode;
      break;
    case awty.PageType.MILESTONE:
    case awty.PageType.DASHBOARD:
      urlSuffix = '/data';
      break;
    default:
      break;
  }

  var currentUrl = window.location.href;
  goog.net.XhrIo.send(currentUrl + urlSuffix, function(e) {
    if (awty.isCurrentlyEditing) {
      return;
    }
    awty.showPossibleErrors(e);
    var xhr = e.target;
    data = xhr.getResponseJson();
    if (awty.currentPageType == awty.PageType.PROGRESS) {
      awty.dataStore.progressData = [];
      awty.dataStore.progressData = data.sort(awty.sortProgressItems);
    } else {
      awty.dataStore.data = [];
      awty.dataStore.data[awty.EntityType.SUBPROJECT] =
          data[0].sort(awty.sortEntities);
      awty.dataStore.data[awty.EntityType.FEATURE] =
          data[1].sort(awty.sortEntities);
      awty.dataStore.data[awty.EntityType.TASK] =
          data[2].sort(awty.sortEntities);
    }
    if (awty.currentPageType == awty.PageType.MILESTONE) {
      var chartUrl = window.location.href + '/chartdata';
      goog.net.XhrIo.send(chartUrl, function(e) {
        var xhr = e.target;
        data = xhr.getResponseJson();
        awty.ChartMaker.drawChart(document.getElementById('chart'),
          data);
      });
    }
    awty.render(pageType);
  });
};


/**
 * Send a request to the server to take a snapshot of the current state of
 * everything.
 */
awty.takeSnapshot = function() {
  var confirmation = confirm('Take a snapshot now?');
  if (confirmation) {
    var currentUrl = window.location.href;
    goog.net.XhrIo.send(currentUrl + '/snapshot?code=' +
        awty.Util.getRandomCode(), function(e) {
      awty.showPossibleErrors(e);
      alert('Snapshot successful.');
    });
  }
};


/**
 * Callback for when a zippy gets clicked.
 */
awty.onZippyClick = function(e) {
  var event = e || window.event;
  var nextSibling = goog.dom.getNextElementSibling(event.target);
  while (nextSibling) {
    nextSibling = goog.dom.getNextElementSibling(nextSibling);
    if (goog.dom.classes.has(nextSibling, 'features')) {
      break;
    }
  }
  if (goog.style.isElementShown(nextSibling)) {
    // Hide the list, show the right triangle.
    event.target.src = '/images/right-triangle.png';
    goog.style.showElement(nextSibling, false);
    awty.expandState[event.target.parentNode.id] = false;
  } else {
    // Show the list, show the down triangle.
    event.target.src = '/images/down-triangle.png';
    goog.style.showElement(nextSibling, true);
    awty.expandState[event.target.parentNode.id] = true;
  }
};


/** */
awty.getWhoAmI = function() {
  var currentUrl = window.location.href;
  goog.net.XhrIo.send('/whoami', function(e) {
    awty.showPossibleErrors(e);
    var xhr = e.target;
    whoami = xhr.getResponse();
  });
}

/** */
awty.appendCreateCommand = function(container, type, opt_parentCode) {
  var callback;
  switch(type) {
    case awty.EntityType.FEATURE:
      callback = goog.partial(awty.createFeature,
            {'subprojectCode': opt_parentCode});
      break;
    case awty.EntityType.SUBPROJECT:
      callback = awty.createSubproject;
      break;
    case awty.EntityType.TASK:
     callback = goog.partial(awty.createTask,
         {'featureCode': opt_parentCode});
      break;
    default:
      break;
  }

  var imageName;
  var imageName = '/images/' + type +'-add.png';
  var imgEl = goog.dom.createDom('img', {
    'src': imageName,
    'onclick': callback,
    'title': 'Create a new ' + type
  })
  goog.dom.appendChild(container, imgEl);
}


/** */
awty.createProgressBar = function(actual, estimate, size) {
  // If we don't get those numbers, assume zero.
  if (!goog.isDef(actual) || isNaN(actual)) {
    actual = 0;
  }
  if (!goog.isDef(estimate) || isNaN(estimate)) {
    estimate = 0;
  }
  var totalWidth = 100;
  var progressBar = goog.dom.createDom('div', {
    'class': 'progress_bar ' + size
  });
  goog.style.setStyle(progressBar, 'width', totalWidth + 'px');
  var innerProgressBar = goog.dom.createDom('div', {
    'class': 'inner_progress_bar'
  });
  goog.style.setStyle(innerProgressBar, 'width',
      actual/estimate * totalWidth + 'px');
  var text = goog.dom.createDom('div', {
    'class': 'progress_bar_text'
  });
  goog.dom.setTextContent(text,
      awty.Util.roundNumber(actual, 2) + '/' +
      awty.Util.roundNumber(estimate, 2));
  goog.dom.appendChild(progressBar, innerProgressBar);
  goog.dom.appendChild(progressBar, text);
  return progressBar;
};

awty.createAllDoneOrNotStartedElement = function(timeSpent) {
  var container = goog.dom.createDom('div', {
    'class': 'all_done'    
  });
  var image = goog.dom.createDom('img', {
    'src': timeSpent > 0 ? '/images/dialog-ok.png' : '/images/icecube.png',
    'title': timeSpent > 0 ? 'Completed (' + timeSpent + ')' : 'Ice box'
  });
  goog.dom.appendChild(container, image);
  return container;
};

/** */
awty.getProjectCodeFromUrl = function(url) {
  var paths = url.split('/');
  return paths[3]
};

/** */
awty.renderSubprojects = function(container, editable, renderInProgressItems,
    renderDoneItems) {
  // TODO(manucornet): Make a clearData method.
  if (!awty.dataStore.userTimeData) {
    awty.dataStore.userTimeData = {};
  }
  var listEl = goog.dom.createDom('ul', {
    'class': 'subprojects'
  });
  for (var i = 0, organizeDataEl; organizeDataEl =
      awty.dataStore.data[awty.EntityType.SUBPROJECT][i]; i++) {
    var currentProjectCode =
        awty.getProjectCodeFromUrl(window.location.href);
    if (organizeDataEl.projectCode != currentProjectCode) {
      continue;
    }
    awty.displaySubproject(organizeDataEl, listEl, editable,
        renderInProgressItems, renderDoneItems);
 }
  if (editable && awty.currentPageType == awty.PageType.ORGANIZE) {
    // Icon to create a new Subproject.
    awty.appendCreateCommand(listEl, awty.EntityType.SUBPROJECT);
  }
  goog.dom.appendChild(container, listEl);
};

awty.strcmp = function(a, b) {
  return ((a == b) ? 0 : ((a > b) ? 1 : -1));
}

awty.emptyTags = function(tags) {
  return tags.length == 0 || (tags.length == 1 && tags[0] == '');
}

awty.sortFeatures = function(a, b) {
  var tagsA = awty.stripPythonMarks(a.tags).split(',').sort();
  var tagsB = awty.stripPythonMarks(b.tags).split(',').sort();

  if (awty.emptyTags(tagsA) && !awty.emptyTags(tagsB)) {
    return 1;
  }
  if (awty.emptyTags(tagsB) && !awty.emptyTags(tagsA)) {
    return -1;
  }
  if (tagsA.length == 0 && tagsB.length == 0) {
    // If neither have tags, compare titles.
    return awty.strcmp(a.title, b.title);
  }

  return awty.strcmp(tagsA[0], tagsB[0]);
}

/** */
awty.renderFeatures = function(container, subproject, editable,
    renderInProgressItems, renderDoneItems) {
  var allFeaturesActual = 0;
  var allFeaturesCurrentEstimate = 0;
  var featuresListEl = goog.dom.createDom('ul', {
    'class': 'features'
  });
  if (awty.currentPageType == awty.PageType.ORGANIZE ||
      awty.currentPageType == awty.PageType.MILESTONE) {
    // Some pages have a lot of data. We'll expand features with zippies.
    if (!goog.isDef(awty.expandState[subproject.code])) {
      awty.expandState[subproject.code] = false;
      goog.style.showElement(featuresListEl, false);
    } else {
      goog.style.showElement(featuresListEl, awty.expandState[subproject.code]);
    }
  }
  var featuresToRender = [];
  for (var i = 0, feature; feature =
      awty.dataStore.data[awty.EntityType.FEATURE][i]; i++) {
    if (feature.subprojectCode == subproject.code) {
      featuresToRender.push(feature);
    }
  }
  featuresToRender = featuresToRender.sort(awty.sortFeatures);
  for (var i = 0; i < featuresToRender.length; i++) {
    var timeData = awty.renderFeature(featuresToRender[i],
        featuresListEl, editable, renderInProgressItems, renderDoneItems);
    allFeaturesActual += timeData[0];
    allFeaturesCurrentEstimate += timeData[1];
  }
  if (editable && awty.currentPageType == awty.PageType.ORGANIZE) {
    // Icon to create a new Feature.
    awty.appendCreateCommand(featuresListEl, awty.EntityType.FEATURE,
        subproject.code);
  }
  goog.dom.appendChild(container, featuresListEl);
  return [allFeaturesActual, allFeaturesCurrentEstimate];
};

/** */
awty.displaySubproject = function(subproject, container, editable,
    renderInProgressItems, renderDoneItems) {
  var subprojectEl = goog.dom.createDom('li', {
    'id': subproject.code,
    'class': awty.EntityType.SUBPROJECT + 
        (editable ? ' ' + awty.EDITABLE_CLASS : '')
  });
  if (editable) {
    goog.events.listen(subprojectEl, 'click',
        goog.partial(awty.onEntityClicked, awty.EntityType.SUBPROJECT));
  }
  var subprojectCodeSpan = goog.dom.createDom('span', {
    'class': 'subproject_code'
  });
  var subprojectTitleSpan = goog.dom.createDom('span', {
    'class': 'subproject_title'
  });
  goog.dom.setTextContent(subprojectCodeSpan, subproject.code);
  goog.dom.setTextContent(subprojectTitleSpan, subproject.title);

  if (awty.currentPageType == awty.PageType.ORGANIZE ||
      awty.currentPageType == awty.PageType.MILESTONE) {
    // We'll have lots of data in some pages, so let's add a zippy.
    var zippyImage = goog.dom.createDom('img', {
      'src': '/images/right-triangle.png',
      'class': 'zippy'
    });
    goog.dom.appendChild(subprojectEl, zippyImage);
    goog.events.listen(zippyImage, 'click', awty.onZippyClick);
  }

  goog.dom.appendChild(subprojectEl, subprojectCodeSpan);
  goog.dom.appendChild(subprojectEl, subprojectTitleSpan);

  var timeData = awty.renderFeatures(subprojectEl, subproject, editable,
      renderInProgressItems, renderDoneItems);
  // Only show a progress bar for sub-projects in the tags page.
  if (awty.currentPageType == awty.PageType.MILESTONE) {
    goog.dom.insertChildAt(subprojectEl, awty.createProgressBar(
            parseFloat(timeData[0]),
            parseFloat(timeData[1]),
            awty.ProgressBarSize.LARGE), 1);
  }

  // In the tag page, no need to display a subproject at all if it has no
  // interesting data.
  if (awty.currentPageType == awty.PageType.MILESTONE &&
    parseFloat(timeData[0]) == 0 && parseFloat(timeData[1]) == 0) {
    return;
  }
  goog.dom.appendChild(container, subprojectEl);
};

awty.getBugHtml = function(bugNumber) {
  if (!bugNumber || parseInt(bugNumber) == 0) {
    return '';
  }
  return '<a href="http://b/' + bugNumber +
      '" target="_blank"><img class="bugimg" ' +
      ' src="/images/bug.png" title="Bug #' + bugNumber + '"></a>';
}

/** */
awty.renderFeature = function(feature, container, editable,
    renderInProgressItems, renderDoneItems, opt_nodeToReplace,
    opt_incrementalRender) {

  // Before doing any DOM manipulation, we need to figure out whether we need
  // to render this feature (if we're requesting for features with only tasks
  // that are completed, and this feature has non-completed tasks, we should
  // stop early).
  var featureHasOnlyDoneTasks = true;
  var featureIsEmpty = true;
  for (var i = 0, task; task =
    awty.dataStore.data[awty.EntityType.TASK][i]; i++) {
    if (task.featureCode != feature.code) {
      continue;
    }
    featureIsEmpty = false;
    if (!awty.taskIsDone(task)) {
      featureHasOnlyDoneTasks = false;
    }
    if (!featureIsEmpty && !featureHasOnlyDoneTasks) {
      // We already know what we need to know.
      break;
    }
  }
  featureHasOnlyDoneTasks = featureHasOnlyDoneTasks && !featureIsEmpty;
  // Don't skip rendering in incremental cases or this will lead to very
  // surprising UIs.
  if (!opt_incrementalRender &&
      (!renderInProgressItems && !featureHasOnlyDoneTasks) ||
      (!renderDoneItems && featureHasOnlyDoneTasks)) {
    // No need to show this feature now.
    return [0, 0];
  }
  if (featureIsEmpty && awty.currentPageType != awty.PageType.ORGANIZE) {
    // We only show the feature if it has children, but on the Organize page we
    // also show empty features.
    return [0, 0];
  }

  var backgroundColorCounter = 0;  // Used to alternate background colors.
  var featureCurrentEstimate = 0;
  var featureActual = 0;
  var featureEl = goog.dom.createDom('li', {
    'id': feature.code,
    'class': awty.EntityType.FEATURE +
        (editable ? ' ' + awty.EDITABLE_CLASS : '')
  });
  if (editable) {
    goog.events.listen(featureEl, 'click',
        goog.partial(awty.onEntityClicked, awty.EntityType.FEATURE));
  }
  featureEl.innerHTML = '<span class="feature_code">' + feature.code + 
      '</span> ' + '<span class="feature_title">' + feature.title + '</span> ' +
      '<span class="feature_milestones">' +
      awty.stripPythonMarks(feature.tags) + '</span>';

  var tasksListEl = goog.dom.createDom('ul', {
    'class': 'tasks'
  });
  for (var i = 0, task; task =
      awty.dataStore.data[awty.EntityType.TASK][i]; i++) {
    var taskEl = goog.dom.createDom('li', {
      'id': task.code,
      'class': awty.EntityType.TASK +
          (editable ? ' ' + awty.EDITABLE_CLASS : '')
    });
    if (editable) {
      goog.events.listen(taskEl, 'click',
          goog.partial(awty.onEntityClicked, awty.EntityType.TASK));
    }

    taskEl.innerHTML = '<span class="task_code">' + task.code + '</span> ' +
        '<span class="task_title">' + task.title + '</span> ' +
        '<span class="task_owner">' + task.owner + '</span>' +
            awty.getBugHtml(task.bugNumber);
    // Increment the time data for the owner.
    if (!awty.dataStore.userTimeData[task.owner]) {
      awty.dataStore.userTimeData[task.owner] = [0.0, 0.0, 0.0];
    }
    var done = awty.taskIsDone(task);
    if (done) {
      goog.dom.insertChildAt(taskEl,
        awty.createAllDoneOrNotStartedElement(parseFloat(task.actualTime)),
        0);
    } else {
      goog.dom.insertChildAt(taskEl, awty.createProgressBar(
          parseFloat(task.actualTime),
          parseFloat(task.currentEstimatedTime),
          awty.ProgressBarSize.SMALL), 0);
    }
    if (task.featureCode == feature.code) {
      // If this task is for the current feature, add it and count it's time
      // towards the total.
      awty.dataStore.userTimeData[task.owner][0] +=
          parseFloat(task.originalEstimatedTime);
      awty.dataStore.userTimeData[task.owner][1] +=
          parseFloat(task.currentEstimatedTime);
      awty.dataStore.userTimeData[task.owner][2] +=
          parseFloat(task.actualTime);

      goog.dom.classes.add(taskEl, backgroundColorCounter % 2 == 0 ?
           'task_even' : 'task_odd');
      goog.dom.appendChild(tasksListEl, taskEl);
      featureCurrentEstimate += parseFloat(task.currentEstimatedTime);
      featureActual += parseFloat(task.actualTime);
      backgroundColorCounter++;
    }
  }
  if (editable && awty.currentPageType == awty.PageType.ORGANIZE) {
    // Icon to create a new task.
    awty.appendCreateCommand(tasksListEl, awty.EntityType.TASK,
        feature.code);
  }
  goog.dom.appendChild(featureEl, tasksListEl);
  if (parseFloat(featureActual) != 0 && featureActual == featureCurrentEstimate) {
    goog.dom.insertChildAt(featureEl, awty.createAllDoneOrNotStartedElement(
        featureActual), 0);
  } else {
    goog.dom.insertChildAt(featureEl, awty.createProgressBar(
      featureActual, featureCurrentEstimate, awty.ProgressBarSize.MEDIUM),
      0);
  }
  if (opt_nodeToReplace) {
    goog.dom.replaceNode(featureEl, opt_nodeToReplace);
  } else {
    goog.dom.appendChild(container, featureEl);
  }
  return [featureActual, featureCurrentEstimate];
};

awty.sortByRemainingTime = function(a, b) {
  return (b[2] - b[3]) - (a[2] - a[3]);
};

awty.renderCriticalPath = function(container) {
  var list = goog.dom.createDom('ol');
  var allUsers = [];
  for (var user in awty.dataStore.userTimeData) {
    allUsers.push([user, awty.dataStore.userTimeData[user][0],
        awty.dataStore.userTimeData[user][1],
        awty.dataStore.userTimeData[user][2]]);
  }
  allUsers = allUsers.sort(awty.sortByRemainingTime);

  for (var i = 0, user; user = allUsers[i]; i++) {
    var listEl = goog.dom.createDom('li');
    listEl.innerHTML = '<b>' + user[0] + '</b> (' +
        // Current estimate minus actual time spent already.
        awty.Util.roundNumber(parseFloat(user[2]) - parseFloat(user[3]), 2) +
        ' remaining)';
    goog.dom.appendChild(list, listEl);
  }
  goog.dom.appendChild(container, list);
};

/** */
awty.clearElementWithId = function(id) {
  document.getElementById(id).innerHTML = '';  
};

/** */
awty.renderProgress = function(container) {
  var listEl = goog.dom.createDom('ul', {});

  // Gather progress items organized by owner.
  var progressItemsByOwner = {};
  var totalTimeSpentByOwner = {};
  for (var i = 0, progressItem; progressItem =
      awty.dataStore.progressData[i]; i++) {
    if (parseFloat(progressItem[2]) == 0.0) {
      // No progress, nothing to show.
      continue;
    }
    if (!progressItemsByOwner[progressItem[1]]) {
      progressItemsByOwner[progressItem[1]] = [];
      totalTimeSpentByOwner[progressItem[1]] = 0;
    }
    progressItemsByOwner[progressItem[1]].push([progressItem[0], progressItem[2]]);
    totalTimeSpentByOwner[progressItem[1]] += parseFloat(progressItem[2]);
  }

  // Now display progress items by owner.
  for (var owner in progressItemsByOwner) {
    var ownerName = goog.dom.createDom('li');
    ownerName.innerHTML = owner + ' (' + awty.Util.roundNumber(
        totalTimeSpentByOwner[owner], 1) + ')';
    goog.dom.appendChild(listEl, ownerName);
    var thisOwnerListEl = goog.dom.createDom('ul', {});
    for (var i = 0, progressItem; progressItem = progressItemsByOwner[owner][i];
        i++) {
      var progressItemListEl = goog.dom.createDom('li');
      progressItemListEl.innerHTML = '<b>' +
          awty.Util.roundNumber(parseFloat(progressItem[1]), 2) +
          '</b> for ' + progressItem[0];
      goog.dom.appendChild(thisOwnerListEl, progressItemListEl);
    }
    goog.dom.appendChild(ownerName, thisOwnerListEl);
    goog.dom.appendChild(listEl, thisOwnerListEl);
  }
  goog.dom.appendChild(container, listEl);
};

awty.taskIsDone = function(task) {
  if (parseFloat(task.actualTime) == 0.0) {
    return false;
  }
  return (parseFloat(task.actualTime) ==
      parseFloat(task.currentEstimatedTime));
};


awty.isCurrentPageEditable = function() {
  if (awty.currentPageType == awty.PageType.ORGANIZE) {
    return true;
  } else if (awty.currentPageType == awty.PageType.MILESTONE) {
    return false;
  } else if (awty.currentPageType == awty.PageType.DASHBOARD) {
    return true;
  } else {
    return false;
  }
};

/** */
awty.render = function(pageType) {
  if (pageType == awty.PageType.PROGRESS) {
    awty.clearElementWithId(pageType);
    var container = document.getElementById(pageType);
    awty.renderProgress(container);
    return;
  }
  if (pageType == awty.PageType.ORGANIZE) {
    awty.clearElementWithId(pageType);
    var container = document.getElementById(pageType);
    awty.renderSubprojects(container, awty.isCurrentPageEditable(),
        true /* renderInProgressItems */, false /* renderDoneItems */);
  } else if (pageType == awty.PageType.MILESTONE) {
    awty.clearElementWithId(pageType);
    var container = document.getElementById(pageType);
    awty.renderSubprojects(container, awty.isCurrentPageEditable(),
        true /* renderInProgressItems */, true /* renderDoneItems */);
    var criticalPathContainer = document.getElementById('critical_path');
    awty.clearElementWithId('critical_path');
    awty.renderCriticalPath(criticalPathContainer);
  } else if (pageType == awty.PageType.DASHBOARD) {
    awty.clearElementWithId(pageType);
    awty.clearElementWithId('done');
    var activeContainer = document.getElementById(pageType);
    awty.renderSubprojects(activeContainer, awty.isCurrentPageEditable(),
        true /* renderInProgressItems */, false /* renderDoneItems */);
  } else {
    awty.clearElementWithId(pageType);
    var container = document.getElementById(pageType);
    awty.renderSubprojects(container, awty.isCurrentPageEditable());
  }
  awty.isCurrentlyEditing = false;
};

/** */
awty.getProperties = function(type) {
  switch(type) {
    case awty.EntityType.FEATURE:
      return awty.featureProperties;
    case awty.EntityType.SUBPROJECT:
      return awty.subprojectProperties;
    case awty.EntityType.TASK:
      return awty.taskProperties;
     default:
    return undefined;
  }
};

/** */
awty.onEntityClicked = function(type, e) {
  var event = e || window.event;
  if (awty.editEntity(type, event.target)) {
    // This is actually an editable entity. Stop propagation to other elements.
    event.stopPropagation();
  }
};

/**
 * @returns Whether we should stop the click's propagation.
 */
awty.editEntity = function(type, entity) {
  if (awty.isEditableContentElement(event.target) ||
      (event.target.tagName && event.target.tagName.toLowerCase() == 'button') ||
      (event.target.tagName && event.target.tagName.toLowerCase() == 'img')) {
    // Do nothing for input fields and the save button.
    return true;
  }
  if (awty.isCurrentlyEditing) {
    // Clicking outside of the currently editing entity. Treat that as cancel.
    awty.cancelCurrentEdit();
    return true;
  }
  if (!goog.dom.classes.has(entity, awty.EDITABLE_CLASS)) {
    // Pass the event on to the parent.
    if (entity.parentNode) {
      return awty.editEntity(type, entity.parentNode);
    } else {
      // Did not find an entity to edit.
      return false;
    }
  }
  var dataElement = awty.createDataElementFromForm(entity);
  var properties = awty.getProperties(type);
  awty.createEntity(entity, type, properties, dataElement, false /* isNew */);
  return true;
};

awty.onInputFocus = function(e) {
  if (!awty.handler_) {
    awty.handler_ = new goog.events.EventHandler();
  }
  awty.keyHandler_ = new goog.events.KeyHandler(e.target);
  awty.handler_.listen(awty.keyHandler_,
      goog.events.KeyHandler.EventType.KEY,
      awty.onInputKeypress);
};

awty.onInputBlur = function(e) {
  awty.handler_.removeAll();
};


awty.onInputKeypress = function(e) {
  if (e.keyCode == goog.events.KeyCodes.ESC) {
    awty.cancelCurrentEdit();
  } else if (e.keyCode == goog.events.KeyCodes.ENTER) {
    // Simulate a click on the Save button.
    document.getElementById('save_button').click();
  }
};

awty.onCompleteHeaderClicked = function(id) {
  // Toggle the element's display.
  var doneDiv = document.getElementById(id);
  goog.style.showElement(doneDiv, !goog.style.isElementShown(doneDiv));
  if (!awty.renderedAtLeastOnce) {
    awty.clearElementWithId('done');
    var doneContainer = document.getElementById('done');
    awty.renderSubprojects(doneContainer, awty.isCurrentPageEditable(),
        false /* renderInProgressItems */, true /* renderDoneItems */);
    awty.renderedAtLeastOnce = true;
  }
};

/** */
awty.createEntity = function(elToReplace, type, properties, userInfo,
    isNew) {
  awty.isCurrentlyEditing = true;
  var theClass;
  // TODO(manucornet): just use the entity type string.
  switch(type) {
    case awty.EntityType.SUBPROJECT:
      theClass = 'subproject';
      break;
    case awty.EntityType.FEATURE:
      theClass = 'feature';
      break;
    case awty.EntityType.TASK:
      theClass = 'task';
      break;
    default:
      break;
  }
  var container = goog.dom.createDom('div', {
    'class': theClass
  });
  if (userInfo && userInfo.code) {
    container.id = userInfo.code;
  }
  var isFirstField = true;
  for (var i = 0, property; property = properties[i]; i++) {
    var input;
    if (property.options) {
      // Select menu.
      input = goog.dom.createDom('select', {
        'name': property.name
      });
      // Prepopulate the value if it's been given to us in userInfo.
      var selected;
      if (userInfo && property.name in userInfo) {
        selected = userInfo[property.name];
      }
      for (var optionNumber in property.options) {
        var optionName = property.options[optionNumber];
        var option = goog.dom.createDom('option', {
          'value': optionName
        });
        option.innerHTML = optionName;
        if (selected == optionName) {
          option.selected = true;
        }
        goog.dom.appendChild(input, option);
      }
    } else if (property.isBoolean) {
      // Checkbox.
      input = goog.dom.createDom('input', {
        'type': 'checkbox',
        'name': property.name,
        'title': property.label,
        // Reverse the logic so that it gets checked by default.
        'checked': !(userInfo[property.name] == 'False')
      });
    } else {
      // Input field.
      input = goog.dom.createDom('input', {
        'type': 'text',
        'name': property.name,
        'placeholder': property.label,
        'size': property.size,
        'hidden': property.hidden,
        'title': property.label,
        'onfocus': awty.onInputFocus,
        'onblur': awty.onInputBlur
      });
      // Prepopulate the value if it's been given to us in userInfo.
      if (userInfo && property.name in userInfo) {
        input.value = awty.stripPythonMarks(userInfo[property.name]);
      }
      if (property.name == 'bugNumber' && input.value == '0') {
        input.value = '';
      }
      // To make the time estimates more explicit, we present them the following
      // way: [Actual box] / [Current est. box] ([Orig est. box])
      if (property.name == 'originalEstimatedTime') {
        var openingBracket = goog.dom.createDom('span', {});
        goog.dom.setTextContent(openingBracket, ' (');
        goog.dom.appendChild(container, openingBracket);
      }
      goog.dom.appendChild(container, input);
      if (property.name == 'originalEstimatedTime') {
        var closingBracket = goog.dom.createDom('span', {});
        goog.dom.setTextContent(closingBracket, ') ');
        goog.dom.appendChild(container, closingBracket);
      }
      if (property.name == 'actualTime') {
        var slash = goog.dom.createDom('span', {});
        goog.dom.setTextContent(slash, ' / ');
        goog.dom.appendChild(container, slash);
      }
    }
  }
  var saveButton = goog.dom.createDom('button', {
    'id': 'save_button',
    'onclick': goog.partial(awty.saveEntity, container, type),
    'title': 'Save'
  });
  goog.dom.appendChild(saveButton, goog.dom.createDom('img', {'src': '/images/dialog-ok.png'}));
  var cancelButton = goog.dom.createDom('button', {
    'id': 'cancel_button',
    'onclick': awty.cancelCurrentEdit,
    'title': 'Cancel'
  });
  goog.dom.appendChild(cancelButton, goog.dom.createDom('img', {'src': '/images/process-stop.png'}));
  goog.dom.appendChild(container, saveButton);
  goog.dom.appendChild(container, cancelButton);
  if (!isNew) {
    var deleteImg = goog.dom.createDom('img', {
      'src': '/images/trash.png',
      'style': 'vertical-align: text-bottom; margin-left: 20px;',
      'title': 'Delete'
    });
    goog.dom.appendChild(container, deleteImg);
    deleteImg.onclick = goog.partial(awty.deleteEntity, container);
  }
  awty.staticElementCurrentlyEdited = elToReplace;
  awty.edtiableElementCurrentlyEdited = container;
  goog.dom.replaceNode(container, elToReplace);

  // Focus the first input field.
  var inputs = document.getElementsByTagName('input');
  for (var i = 0, input; input = inputs[i]; i++) {
    if (input.type != 'checkbox' && !input.hidden) {
      input.focus();
      input.select();
      break;
    }
  }
};

/** */
awty.stripPythonMarks = function(str) {
  if (str.substr(0, 1) == '[' &&
      str.substr(str.length - 1, str.length) == ']') {
    var list = str.substr(1, str.length - 2);
    var tags = list.split(',');
    for (var i = 0, tag; tag = tags[i]; i++) {
      var newTag = goog.string.trim(tags[i]);
      if (newTag.substr(0, 2) == "u'" &&
          newTag.substr(newTag.length - 1, newTag.length) == "'") {
        newTag = newTag.substr(2, newTag.length - 3);
      }
      tags[i] = newTag;
    }
    return tags.join(',');
  } else {
    return str;
  }
};

/** */
awty.findEntityWithCode = function(code, type) {
  for (var i = 0, entity; entity = awty.dataStore.data[type][i]; i++) {
    if (entity.code == code) {
      return entity;
    }
  }
  return null;  
};

/** */
awty.createDataElementFromForm = function(form) {
  // Try to find the object in the data store.
  if (form.id && form.className) {
    var entityType = awty.getEntityTypeFromElement(form);
    if (!entityType) {
      // Can't do much.
      return null;
    }
    var savedObject = awty.findEntityWithCode(form.id, entityType);
  }
  var object = savedObject ? savedObject : {};
  for (var i = 0, input; input = form.childNodes[i]; i++) {
    if (input.type == 'checkbox') {
      object[input.name] = input.checked ? 'True' : 'False';
    } else {
      if (input.tagName = 'button') {
        object[input.name] = input.value;
      }
    }
  }
  return object;
}


/**
 * Looks in the DOM for the node representing the feature for the given task.
 */
awty.findFeatureNodeForTask = function(node) {
  if (!node) {
    return null;
  }
  if (goog.dom.classes.has(node, 'feature')) {
    return node;
  } else {
    return awty.findFeatureNodeForTask(node.parentNode);
  }
};

/** */
awty.saveEntity = function(container, type) {
  awty.isCurrentlyEditing = false;
  var properties = awty.getProperties(type);
  var dataElement = awty.createDataElementFromForm(container);
  var url;
  switch(type) {
    case awty.EntityType.SUBPROJECT:
      url = awty.Util.getProjectUrl() + '/createsubproject';
      break;
    case awty.EntityType.FEATURE:
      url = awty.Util.getProjectUrl() + '/createfeature';
      break;
    case awty.EntityType.TASK:
      url = awty.Util.getProjectUrl() + '/createtask';
      break;
    default:
      break;
  }
  var dataArray = awty.dataStore.data[type];
  var savedLocally;
  for (var i = 0, object; object = dataArray[i]; i++) {
    // TODO(manucornet): Revisit this logic.
    if (((type == awty.EntityType.FEATURE ||
          type == awty.EntityType.SUBPROJECT) ||
          object.featureCode == dataElement.featureCode) &&
          object.code == dataElement.code) {
      dataArray[i] = object;
      savedLocally = true;
      break;
    }
  }
  if (!savedLocally) {
    // This is an add, not an edit.
    dataArray.push(dataElement);

    // We removed the "create new XYZ" icon when making this new entity, we
    // should now restore it.
    var parentCode;
    if (type == awty.EntityType.FEATURE) {
      parentCode = dataElement.subprojectCode
    } else if (type == awty.EntityType.TASK) {
      parentCode = dataElement.featureCode;
    }
    awty.appendCreateCommand(container.parentNode, type, parentCode);
  }

  // Our local data is now up to date, time to render this entity.
  // If a previous version of this entity exists, remove that.
  var parentNode = awty.edtiableElementCurrentlyEdited.parentNode;

  // Since we display a progress bar at the feature level, we need to re-render
  // the whole feature when saving tasks.
  if (type == awty.EntityType.TASK) {
    var featureNode = awty.findFeatureNodeForTask(parentNode);
    parentNode = featureNode.parentNode;
  }
  if (type == awty.EntityType.SUBPROJECT) {
    // TODO(manucornet): Too much work.
    awty.render(awty.currentPageType);
  } else if (type == awty.EntityType.TASK) {
    // TODO(manucornet): Add 'onlyDone' class to only done features.
    awty.renderFeature(awty.findEntityWithCode(featureNode.id,
            awty.EntityType.FEATURE),
        parentNode, awty.isCurrentPageEditable(),
        true,
        goog.dom.classes.has(featureNode, 'onlyDone'),
        featureNode /* nodeToReplace */, true /* incremental */);
  } else if (type == awty.EntityType.FEATURE) {
    awty.renderFeature(dataElement,
        parentNode, awty.isCurrentPageEditable(), true, false, 
        awty.edtiableElementCurrentlyEdited /* nodeToReplace */,
            true /* incremental */);
  }

  // Now save on the server.
  var uri = new goog.Uri(url);
  for (property in dataElement) {
    if (property && dataElement[property]) {
      // TODO(manucornet): Find out why we get an empty property in the first
      // place.
      uri.setParameterValue(property, dataElement[property]);
    }
  }
  goog.net.XhrIo.send(uri, awty.showPossibleErrors);
};

/**
 * Figures out which kind of entity this is from the element's class name.
 */
awty.getEntityTypeFromElement = function(element) {
  for (var entityType in awty.EntityType) {
    if (goog.dom.classes.has(element, awty.EntityType[entityType])) {
      return awty.EntityType[entityType];
    }
  }
  return null;
};

/**
 * Deletes the entity represented in the given container. This expects that
 * the container's ID is the entity's unique code.
 */
awty.deleteEntity = function(container, e) {
  var event = e || window.event;
  event.stopPropagation();

  var entityType = awty.getEntityTypeFromElement(event.target.parentNode);
  if (!entityType) {
    // Can't do much.
    return;
  }
  var confirmation = confirm('Delete this entity and all its children?');
  if (confirmation) {
    var code = container.id;
    var deletionUrl;
    switch(entityType) {
      case awty.EntityType.SUBPROJECT:
        deletionUrl = awty.Util.getProjectUrl() + '/deletesubproject?code=' + code;
        break;
      case awty.EntityType.FEATURE:
        deletionUrl = awty.Util.getProjectUrl() + '/deletefeature?code=' + code;
        break;
      case awty.EntityType.TASK:
        deletionUrl = awty.Util.getProjectUrl() + '/deletetask?code=' + code;
        break;
      default:
        break;
    }
    goog.net.XhrIo.send(deletionUrl, awty.showPossibleErrors);
    goog.dom.removeNode(container);
    // Also remove the data node.
    var entityToDelete = awty.findEntityWithCode(code, entityType);
    goog.array.remove(awty.dataStore.data[entityType], entityToDelete);

    awty.isCurrentlyEditing = false;
  } else {
    awty.cancelCurrentEdit();
  }
};

/** */
awty.showPossibleErrors = function(e) {
  var xhr = e.target;
  var error = xhr.getLastError();
  if (error) {
    alert(xhr.getResponse());
    window.location.reload();
  }
};

// TODO(manucornet): Derive the properties from the type.
/** */
awty.createSubproject = function(e) {
  var event = e || window.event;
  var userInfo = {
      'code': awty.Util.getRandomCode(),
      'projectCode': awty.getProjectCodeFromUrl(window.location.href),
      'admins': whoami
  };
  awty.createEntity(event.target, awty.EntityType.SUBPROJECT,
      awty.subprojectProperties, userInfo, true /* isNew */);
};

/** */
awty.createFeature = function(userInfo, e) {
  var event = e || window.event;
  userInfo.code = awty.Util.getRandomCode();
  userInfo.owner = whoami;
  awty.createEntity(event.target, awty.EntityType.FEATURE,
      awty.featureProperties, userInfo, true /* isNew */);
};

/** */
awty.createTask = function(userInfo, e) {
  var event = e || window.event;
  userInfo.code = awty.Util.getRandomCode();
  userInfo.owner = whoami;
  awty.createEntity(event.target, awty.EntityType.TASK,
      awty.taskProperties, userInfo, true /* isNew */);
};
