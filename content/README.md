# Content

This folder stores source content for easy updates without a backend.

## Structure

- `content/blog/`: Blog entries in Markdown.
- `content/work-experiences/`: Work experience entries in Markdown.
- `content/research-experiences/`: Research experience entries in Markdown.
- `content/volunteering/`: Volunteering role entries in Markdown.
- `data/education.json`: Education entries as structured JSON.
- `data/awards.json`: Awards and honours entries as structured JSON.
- `data/certifications.json`: Certification and workshop entries as structured JSON.
- `data/talks.json`: Conference and talk entries as structured JSON.

## Editing flow

1. Add or update a Markdown file in the relevant folder, or edit JSON files in `data/` for structured sections.
2. Use the front matter fields as your canonical source of truth.
3. Copy final text into `blog.html` or `cv.html` when publishing.

## Blog front matter

For files in `content/blog/`, include:

- `source: "website"` for blogs hosted on this site
- `source: "external"` for blogs published on external platforms

This keeps all content versioned in Git while the site stays fully static.
