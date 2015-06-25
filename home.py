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

class HomeHandler(webapp2.RequestHandler):
  def get(self, resource):
    userName = Util.getUsernameFromEmail(users.get_current_user().email())
    projectCodeParam = urllib.unquote(resource)

    # Build the list of my projects
    myProjectsRendered = ''
    myProjectCodes = []
    milestones = None
    myTasks = Task.gql("WHERE owner = '" +
        userName + "'")
    for task in myTasks:
      myFeatures = Feature.gql("WHERE code = '" + task.featureCode + "'")
      for feature in myFeatures:
        mySubprojects = Subproject.gql("WHERE code = '" +
            feature.subprojectCode + "'")
        for subproject in mySubprojects:
          project = Project.gql("WHERE code = '" +
              subproject.projectCode + "'").get()
          if project is not None and not project.code in myProjectCodes:
            myProjectCodes.append(project.code)
    if len(myProjectCodes) == 0:
      myProjectsRendered = 'You do not have any projects yet. '
    else:
      myProjectsRendered = myProjectsRendered + 'My projects:<br /><ul>'
      for projectCode in myProjectCodes:
        project = Project.gql("WHERE code= '" + projectCode + "'").get()
        myProjectsRendered = myProjectsRendered + \
            '<li><a href="/' + project.code + '">' + project.title +'</a></li>'
      myProjectsRendered = myProjectsRendered + '</ul>'

    otherProjectsRendered = 'Existing projects: <ul>'
    allExistingProjects = Project.gql("ORDER BY title")
    for existingProject in allExistingProjects:
      otherProjectsRendered = otherProjectsRendered + '<li>' + \
          '<a href="/' + existingProject.code + '">' + existingProject.title + \
          '</li>'
    otherProjectsRendered = otherProjectsRendered + '</ul>'
    otherProjectsRendered = otherProjectsRendered + \
        '<br /><a href="/createproject">Create a new project</a>'

    project = Project.gql("WHERE code = '" + projectCodeParam + "'").get()
    if projectCodeParam != '' and project == None:
      homeRendered = 'No project with code ' + projectCodeParam + '<br/><br />' + \
          myProjectsRendered
    elif project != None:
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
      homeRendered = template.render('home.html', {
        'project_name': project.title,
        'project_code': project.code,
        'milestones': milestones,
        'current_user': userName,
        'admin': userName in project.admins or userName == 'manucornet'
      });
    else:
      homeRendered = myProjectsRendered + otherProjectsRendered

    self.response.out.write(template.render('base.html', {
      'current_user': userName,
      'project_code': project.code if project != None else '',
      'project_name': project.title if project != None else '',
      'content': homeRendered,
      'onloadFunction': 'awty.onHomeBodyLoaded',
      'milestones': milestones
    }))

app = webapp2.WSGIApplication(
      [
        ('/(.*)', HomeHandler),
      ], debug=True)

