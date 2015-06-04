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

from google.appengine.api import users

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
 

import urllib

from models import *
from util import *

class CreateTaskHandler(webapp2.RequestHandler):
  def getOptionalFloatParam(self, paramName):
    paramString = self.request.GET.get(paramName)
    if paramString == None:
      return float(0)
    return float(0) if len(paramString) == 0 else float(paramString)

  def getOptionalNumberParam(self, paramName):
    paramString = self.request.GET.get(paramName)
    if paramString == None:
      return 0
    return 0 if len(paramString) == 0 else int(paramString)

  def getBooleanParam(self, paramName):
    paramString = self.request.GET.get(paramName)
    if paramString == None:
      return False
    return True if paramString == "True" else False

  def get(self, projectCodeParam):
    projectCode = urllib.unquote(projectCodeParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No project with code ' + projectCode)
      return

    featureCode = self.request.GET.get('featureCode');
    feature = Feature.gql("WHERE code ='" + featureCode + "'").get()
    if feature == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No Feature with code ' + featureCode)
      return

    # TODO(manucornet): Check uniqueness.
    code = self.request.GET.get('code')
    owner = self.request.GET.get('owner')
    if owner == None:
      owner = ""
    title = self.request.GET.get('title')
    active = self.getBooleanParam('active')
    bugNumber = self.getOptionalNumberParam('bugNumber')
    notes = self.request.GET.get('notes')
    originalEstimatedTime = self.getOptionalFloatParam('originalEstimatedTime')
    currentEstimatedTime = self.getOptionalFloatParam('currentEstimatedTime')
    actualTime = self.getOptionalFloatParam('actualTime')
    task = Task(title=title, code=code, bugNumber=bugNumber, notes=notes,
        featureCode=featureCode, owner=owner,
        project=project, originalEstimatedTime=originalEstimatedTime,
        currentEstimatedTime=currentEstimatedTime, actualTime=actualTime,
        active=active)
    previousTask = Task.gql("WHERE code = '" + code + "'").get();
    if previousTask != None:
      previousTask.delete()
    task.put()


  app = webapp2.WSGIApplication(
          [
            ('/(.*)/createtask', CreateTaskHandler),
          ], debug=True)
