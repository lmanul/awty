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
 

import json
import urllib
import webapp2

from models import *
from util import *

class OrganizeHandler(webapp2.RequestHandler):
  def get(self, resource):
    projectCode = urllib.unquote(resource)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.out.write('No project with code ' + projectCode)
      self.response.out.write('<br /><br /><a href="/createproject">\
          Create a new project</a>')
      return

    organizeRendered = template.render('section.html', {
      'title': project.title + ' (in progress)',
      'section_id': 'organize',
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
      'onloadFunction': 'awty.onOrganizeBodyLoaded',
      'project_code': project.code,
      'project_name': project.title,
      'milestones': milestones,
      'content': organizeRendered + doneRendered
    }))

class OrganizeDataHandler(webapp2.RequestHandler):
  def get(self, projectParam):
    # TODO(manucornet): Restrict to this project.
    subprojectsArray = []
    featuresArray = []
    tasksArray = []
    allMySubprojects = Subproject.gql("")
    allMyFeatures = Feature.gql("")
    allMyTasks = Task.gql("")
    for s in allMySubprojects:
      subprojectsArray.append(s.to_dict())
    for o in allMyFeatures:
      featuresArray.append(o.to_dict())
    for t in allMyTasks:
      tasksArray.append(t.to_dict())
    returnData = [subprojectsArray, featuresArray, tasksArray]
    self.response.out.write(json.dumps(returnData))

app = webapp2.WSGIApplication(
      [
        ('/(.*)/organizedata', OrganizeDataHandler),
        ('/(.*)/organize', OrganizeHandler),
      ], debug=True)

