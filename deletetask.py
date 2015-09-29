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

from google.appengine.api import users

from google.appengine.ext import db
from google.appengine.ext import webapp
 
import urllib
import webapp2

from models import *
from util import *

class DeleteTaskHandler(webapp2.RequestHandler):
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
    task = Task.gql("WHERE code ='" + code + "'").get()
    if task == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No task with code ' + code)
      return

    # TODO(manucornet): Restore some amount of write access control.
    #if Util.getUsernameFromEmail(users.get_current_user().email()) != task.owner and \
    #   not Util.getUsernameFromEmail(users.get_current_user().email()) in project.admins:
    #  self.response.headers['Status'] = 403
    #  self.response.out.write('Only the owner of a task can delete it')
    #  return
    task.delete()

app = webapp2.WSGIApplication(
      [
        ('/(.*)/deletetask', DeleteTaskHandler),
      ], debug=True)
