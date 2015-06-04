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
from google.appengine.ext.webapp.util import run_wsgi_app

import simplejson as json
import urllib

from models import *
from util import *

class ProgressHandler(webapp.RequestHandler):
  def get(self, projectParam):
    projectCode = urllib.unquote(projectParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.out.write('No project with code ' + projectCode)
      return

    progressChoices = '<select onchange="awty.onSnapshotChoiceChanged()" id="snapshot_select">'
    snapshots = Snapshot.gql("WHERE projectCode = '" + project.code + "' ORDER BY date DESC")
    for snapshot in snapshots:
      progressChoices = progressChoices + '<option value="' + snapshot.code + \
          '">' + str(snapshot.date) + '</option>'
    progressChoices = progressChoices + '</select>'
    progressChoiceRendered = template.render('section.html', {
      'title': project.title + ' &#8213; Progress since ' + progressChoices + ' (last weekly meeting)',
      'section_id': 'progress',
      'content': 'Loading...'
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
      'onloadFunction': 'awty.onProgressBodyLoaded',
      'project_code': project.code,
      'project_name': project.title,
      'milestones': milestones,
      'content': progressChoiceRendered
    }))

class ProgressDataHandler(webapp.RequestHandler):
  def get(self, projectParam, snapshotCodeParam):
    projectCode = urllib.unquote(projectParam)
    snapshotCode = urllib.unquote(snapshotCodeParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.out.write('No project with code ' + projectCode)
      return

    snapshot = Snapshot.gql("WHERE code = '" + snapshotCode + "'").get()
    if snapshot == None:
      self.response.out.write('No snapshot with code ' + snapshotCode)
      return

    taskProgressItems = []
    # Get all tasks for this project.
    subprojects = Subproject.gql("WHERE projectCode = '" + project.code + "'")
    for subproject in subprojects:
      features = Feature.gql("WHERE subprojectCode = '" + subproject.code +
          "'")
      for feature in features:
        tasks = Task.gql("WHERE featureCode = '" + feature.code + "'")
        for task in tasks:
          correspondingTaskSnapshot = TaskSnapshot.gql("WHERE taskCode = '" + \
              task.code + "' AND snapshotCode = '" + snapshot.code + "'").get()
          if correspondingTaskSnapshot == None:
            timeSpentSinceSnapshot = task.actualTime
          else:
            timeSpentSinceSnapshot = task.actualTime - correspondingTaskSnapshot.actualTime
          taskProgressItems.append([task.title, task.owner, timeSpentSinceSnapshot])
    returnData = taskProgressItems
    self.response.out.write(json.dumps(returnData))

def main():
  application = webapp.WSGIApplication(
        [
          ('/([^/]*)/progress', ProgressHandler),
          ('/([^/]*)/progressdata/([^/]*)', ProgressDataHandler),
        ], debug=True)
  run_wsgi_app(application)
  
if __name__ == '__main__':
  main()
