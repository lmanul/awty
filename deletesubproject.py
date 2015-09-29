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
 

import urllib
import webapp2

from models import *
from util import *

class DeleteSubprojectHandler(webapp2.RequestHandler):
  def get(self, projectCodeParam):
    projectCode = urllib.unquote(projectCodeParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No project with code ' + projectCode)
      return

    code = self.request.GET.get('code');
    if code == None:
      code = ''
    subproject = Subproject.gql("WHERE code ='" + code + "'").get()
    if subproject == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No subproject with code ' + code)
      return

    if not Util.getUsernameFromEmail(users.get_current_user().email()) in subproject.admins and \
       not Util.getUsernameFromEmail(users.get_current_user().email()) in project.admins:
      self.response.headers['Status'] = 403
      self.response.out.write('Only admins of a subproject can delete it')
      return
    subproject.delete()

    # Also delete all features and tasks related to this subproject.
    allRelatedFeatures = Feature.gql("WHERE subprojectCode = '" +
        subproject.code + "'")
    for f in allRelatedFeatures:
      allRelatedTasks = Task.gql("WHERE featureCode = '" + f.code + "'")
      for t in allRelatedTasks:
        t.delete()
      f.delete()


  app = webapp2.WSGIApplication(
          [
            ('/(.*)/deletesubproject', DeleteSubprojectHandler),
          ], debug=True)
