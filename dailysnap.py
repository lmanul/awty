# -*- coding: utf-8 -*- #
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
 

import json
import urllib
import webapp2

from models import *
from util import *

import datetime
import logging

class DailySnapHandler(webapp2.RequestHandler):
  def addToDailyTagSnaps(self, snapA, origEst, currEst, actual):
    snapA.originalEstimatedTime = snapA.originalEstimatedTime + origEst
    snapA.currentEstimatedTime = snapA.currentEstimatedTime + currEst
    snapA.actualTime = snapA.actualTime + actual
    return snapA
  def get(self):
    allProjects = Project.gql("")
    for project in allProjects:
      dailyTagSnapsToSave = {}
      allSubProjects = Subproject.gql("WHERE projectCode = '" + project.code + "'")
      for subproject in allSubProjects:
        allFeatures = Feature.gql("WHERE subprojectCode = '" + subproject.code + "'")
        for feature in allFeatures:
          thisFeatureActualTime = 0.0
          thisFeatureCurrentEstimate = 0.0
          thisFeatureOriginalEstimate = 0.0
          allTasks = Task.gql("WHERE featureCode = '" + feature.code + "'")
          for task in allTasks:
            thisFeatureActualTime = thisFeatureActualTime + task.actualTime
            thisFeatureCurrentEstimate = thisFeatureCurrentEstimate + task.currentEstimatedTime
            thisFeatureOriginalEstimate = thisFeatureOriginalEstimate + task.originalEstimatedTime
          for tag in feature.tags:
            if tag in dailyTagSnapsToSave:
              currentTagSnapToSave = dailyTagSnapsToSave[tag]
            else:
              currentTagSnapToSave = DailyTagSnap(date=datetime.date.today(),
                  tag=tag, projectCode=project.code, originalEstimatedTime=0.0,
                  currentEstimatedTime=0.0, actualTime=0.0)
            currentTagSnapToSave = self.addToDailyTagSnaps(currentTagSnapToSave,
                thisFeatureOriginalEstimate, thisFeatureCurrentEstimate, thisFeatureActualTime)
            dailyTagSnapsToSave[tag] = currentTagSnapToSave
      for tag in dailyTagSnapsToSave:
        today = datetime.date.today()
        # If we already have this in store (shouldn't happen), replace it.
        existingTagSnap = DailyTagSnap.all().filter(
            "projectCode = ", project.code).filter("tag = ", tag).filter("date = ", today).get()

        if existingTagSnap is not None:
          existingTagSnap.delete()
        dailyTagSnapsToSave[tag].put()


app = webapp2.WSGIApplication(
        [
          ('/dailysnapundiscoverableurl', DailySnapHandler),
        ], debug=True)
