# Endpoint for retrieving pinboards

Requesting a single ```pinboard``` returns information about the pinboard, as well as pad ```ids``` for the pinboard. ```page``` and ```limit``` apply for pagination of the pads.

Requesting no or multiple ```pinboard``` returns a list of pinboards. ```page``` and ```limit``` apply to the list of pinboards.

Each returned value includes a ```is_contributor``` key that establishes whether the current user requesting the resource is a contributor to the pinboard in question.

When requesting multiple boards, the ```space``` parameter can be passed to get personal, public, or a mix of both boards. The values for ```space``` are ```private```, ```published```, and ```all``` (default, including both personal bards—not necessarily published—and public boards).

The ```databases``` parameter can be passed to determine which databases to pull from. It should be a list (array), either of the db ids or their shorthand names.