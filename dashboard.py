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
 

import simplejson as json
import urllib
import webapp2

from models import *
from util import *

class DashboardHandler(webapp2.RequestHandler):
  def get(self, projectParam, currentUser):
    projectCode = urllib.unquote(projectParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.out.write('No project with code ' + projectCode)
      self.response.out.write('<br /><br /><a href="/createproject">\
          Create a new project</a>')
      return

    activeRendered = template.render('subsection.html', {
      'title': ' Active',
      'subsection_id': 'dashboard',
    });
    doneRendered = template.render('subsection.html', {
      'title': ' Completed',
      'subsection_id': 'done',
      'isDoneSection': True,
    });
    dashboardRendered = template.render('section.html', {
      'title': project.title + ' &#8213; ' + currentUser + '\'s Dashboard',
      'section_id': 'dashboard_container',
      'content': activeRendered + doneRendered
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
      'current_user': currentUser,
      'onloadFunction': 'awty.onDashboardBodyLoaded',
      'project_code': project.code,
      'project_name': project.title,
      'milestones': milestones,
      'content': dashboardRendered
    }))

class DashboardDataHandler(webapp2.RequestHandler):
  def get(self, projectParam, currentUser):
    myTasks = Task.gql("WHERE owner = '" + currentUser + "'")

    mySubprojectsArray = []
    myFeaturesArray = []
    myTasksArray = []
    alreadyAddedFeatureCodes = []
    alreadyAddedSubprojectCodes = []
    for t in myTasks:
      myTasksArray.append(t.to_dict())
      #relatedFeaturesArray.append(f.to_dict())

      relatedFeature = Feature.gql("WHERE code = '" +
          t.featureCode + "'").get()
      if relatedFeature == None:
        continue
      if not relatedFeature.code in alreadyAddedFeatureCodes:
        myFeaturesArray.append(relatedFeature.to_dict())
        alreadyAddedFeatureCodes.append(relatedFeature.code)

      relatedSubproject = Subproject.gql(
          "WHERE code = '" + relatedFeature.subprojectCode + "'").get()
      if relatedSubproject is not None and not relatedSubproject.code in alreadyAddedSubprojectCodes:
        mySubprojectsArray.append(relatedSubproject.to_dict())
        alreadyAddedSubprojectCodes.append(relatedSubproject.code)

    returnData = [mySubprojectsArray, myFeaturesArray, myTasksArray]
    self.response.out.write(json.dumps(returnData))

app = webapp2.WSGIApplication(
      [
        ('/([^/]*)/dashboard/([^/]*)/data', DashboardDataHandler),
        ('/([^/]*)/dashboard/([^/]*)', DashboardHandler),
      ], debug=True)

