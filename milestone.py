#
# Copyright 2011 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http:#www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from google.appengine.api import memcache
from google.appengine.api import users

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
 

import simplejson as json
import urllib

from models import *
from util import *

import datetime
import logging

class MilestoneHandler(webapp2.RequestHandler):
  def get(self, projectParam, milestoneParam):
    projectCode = urllib.unquote(projectParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.out.write('No project with code ' + projectCode)
      self.response.out.write('<br /><br /><a href="/createproject">\
          Create a new project</a>')
      return

    milestoneRendered = template.render('section.html', {
      'title': project.title + ' &#8213; <b>' + milestoneParam + '</b>',
      'section_id': 'milestone',
      'content': 'Loading...'
    });
    chartElement = template.render('section.html', {
      'title': 'Burn down',
      'section_id': 'burndown',
      'content': '<div id="chart">Drawing...</div>'
    });
    criticalPathRendered = template.render('section.html', {
      'title': 'Time re
      'section_id': 'critical_path',
      'content': 'Loading...'
    });

    doneRendered = template.render('subsection.html', {
      'title': 'Completed',
      'subsection_id': 'done',
      'isDoneSection': True,
    });

    # Let's get the list of milestones.
    milestones = []
    subprojects = Subproject.gql("WHERE projectCode = '" + project.code + "'")
    for subproject in subprojects:
      features = Feature.gql("WHERE subprojectCode = '" + subproject.code +
          "'")
      for feature in features:
        for featureMilestone in feature.tags:
          if not featureMilestone in milestones:
            milestones.append(featureMilestone)
    milestones.sort()

    self.response.out.write(template.render('base.html', {
      'current_user': Util.getUsernameFromEmail(users.get_current_user().email()),
      'onloadFunction': 'awty.onMilestoneBodyLoaded',
      'project_code': project.code,
      'project_name': project.title,
      'milestones': milestones,
      'content': milestoneRendered + chartElement + criticalPathRendered + doneRendered
    }))

class MilestoneDataHandler(webapp2.RequestHandler):
  def get(self, projectParam, milestoneParam):
    projectCode = urllib.unquote(projectParam)
    cacheKey = projectCode + '_' + milestoneParam + '_milestoneData'
    cachedData = memcache.get(cacheKey)
    #if cachedData is not None:
    #  self.response.out.write(cachedData)
    #  return
    allRelatedFeatures = Feature.gql("WHERE tags = '" + milestoneParam + "'")
    relatedSubprojectsArray = []
    relatedFeaturesArray = []
    relatedTasksArray = []
    alreadyAddedSubprojectCodes = []
    for f in allRelatedFeatures:
      relatedFeaturesArray.append(f.to_dict())
      relatedSubproject = Subproject.gql(
          "WHERE code = '" + f.subprojectCode + "'").get()
      if not relatedSubproject.code in alreadyAddedSubprojectCodes:
        relatedSubprojectsArray.append(relatedSubproject.to_dict())
        alreadyAddedSubprojectCodes.append(relatedSubproject.code)
      allRelatedTasks = Task.gql("WHERE featureCode = '" + f.code + "'")
      for t in allRelatedTasks:
        relatedTasksArray.append(t.to_dict())

    returnData = json.dumps([relatedSubprojectsArray,
                             relatedFeaturesArray,
                             relatedTasksArray])
    self.response.out.write(returnData)
    #if not memcache.add(cacheKey, returnData, 21600): # Expire in 6 hours
    #  logging.error("Memcache set failed.")

class MilestoneChartDataHandler(webapp2.RequestHandler):
  def get(self, projectParam, milestoneParam):
    projectCode = urllib.unquote(projectParam)
    #cacheKey = projectCode + '_' + milestoneParam + '_chartData'
    #cachedData = memcache.get(cacheKey)
    #if cachedData is not None:
    #  self.response.out.write(cachedData)
    #  return
    milestoneChartData = []
    allSnapsForThisTag = DailyTagSnap.all().filter(
        "projectCode = ", projectCode).filter("tag = ", milestoneParam)
    for snap in allSnapsForThisTag:
      milestoneChartData.append([snap.date.isoformat(), snap.currentEstimatedTime,
                                 snap.actualTime])

    # We also need a data point for "today"
    totalEstimatedTime = 0
    totalActualTime = 0
    relatedFeatures = []
    allSubprojects = Subproject.gql("WHERE projectCode = '" + projectCode + "'")
    for s in allSubprojects:
      featuresHere = Feature.gql("WHERE subprojectCode = '" + s.code + \
          "' AND tags = '" + milestoneParam + "'")
      for f in featuresHere:
        relatedFeatures.append(f)
    for f in relatedFeatures:
      #totalEstimatedTime = totalEstimatedTime + 1
      relatedTasks = Task.gql("WHERE featureCode = '" + f.code + "'")
      for t in relatedTasks:
        totalEstimatedTime = totalEstimatedTime + t.currentEstimatedTime
        totalActualTime = totalActualTime + t.actualTime
    milestoneChartData.append([datetime.datetime.now().isoformat(' '),
        totalEstimatedTime, totalActualTime])

    arrayData = json.dumps(milestoneChartData)
    self.response.out.write(arrayData)
    #if not memcache.add(cacheKey, arrayData, 7200): # Expire in 2 hours
    #  logging.error("Memcache set failed.")

app = webapp2.WSGIApplication(
      [
        ('/([^/]*)/tag/([^/]*)/data', MilestoneDataHandler),
        ('/([^/]*)/tag/([^/]*)/chartdata', MilestoneChartDataHandler),
        ('/([^/]*)/tag/(.*)', MilestoneHandler),
      ], debug=True)

