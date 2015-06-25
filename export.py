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
 

import datetime
import json
import urllib
import webapp2

from models import *
from util import *

class ExportHandler(webapp2.RequestHandler):
  def get(self, projectParam):
    projectCode = urllib.unquote(projectParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.out.write('No project with code ' + projectCode)
      self.response.out.write('<br /><br /><a href="/createproject">\
          Create a new project</a>')
      return

    output = """#Format:
#subproject,code,title
#feature,code,title,subprojectCode,owner,tags
#task,code,title,owner,featureCode,origEst,currentEst,actual"""
    # Get all the stuff in this project.
    subprojects = Subproject.gql("WHERE projectCode = '" + project.code + "'")
    for subproject in subprojects:
      output = output + '\n' + ','.join(['subproject', subproject.code,
          subproject.title]) 
      features = Feature.gql("WHERE subprojectCode = '" + subproject.code +
          "'")
      for feature in features:
        allTags = ':'.join(feature.tags)
        output = output + '\n' + ','.join(['feature', feature.code, feature.title,
            feature.subprojectCode, feature.owner, allTags])
        tasks = Task.gql("WHERE featureCode = '" + feature.code + "'")
        for task in tasks:
          output = output + '\n' + ','.join(['task', task.code, task.title,
              task.owner, task.featureCode, str(task.originalEstimatedTime), 
              str(task.currentEstimatedTime), str(task.actualTime)])
    now = datetime.datetime.now()
    self.response.headers['Content-Disposition'] = \
        str('attachment;filename=' + project.code + '-' + str(now.year) + '.' + \
            str(now.month) + '.' + str(now.day) + '.csv')
    self.response.out.write(output)


app = webapp2.WSGIApplication(
      [
        ('/([^/]*)/export', ExportHandler),
      ], debug=True)
