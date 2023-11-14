# Browsing pads

## Spaces

### Private
The user sees their own pads.

### Curated
The user sees all unpublished pads (```status < 2```) contributed to mobilizations they launch and curate. This **does not** include their own contributions, which are shown in the ```/private``` space. 

Sudo users see all unpublished pads (```status < 2```) to help solve publication issues.

### Team (new)
The user sees all pads contributed by their different team mates. This **does not** include their own contributions, which are shown in the ```/private``` space.

### Shared
The user sees all pads published without a review (```status === 2```). In the front-end, these are called "preprints". This includes their own contributions.

**TO DO: this needs to be updated to the collection of collections idea. In shared, you can only see the preprints of those within your group of teams**
**THIS SHOULD ACTUALLY BECOME BE THE "TEAM" VIEW**

### Public
The user sees all public pads: pads published with a review (```status > 2```).