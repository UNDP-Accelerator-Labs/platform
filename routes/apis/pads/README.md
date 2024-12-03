# /pads
output { string: 'json' } // must specify
use_templates { boolean: false }
include_data { boolean: true }
include_imgs { boolean: false }
include_tags { boolean: false }
include_locations { boolean: false }
include_metafields { boolean: false }
include_source { boolean: false }
include_engagement { boolean: false }
include_comments { boolean: false }
include_pinboards { string: 'all', 'own' }