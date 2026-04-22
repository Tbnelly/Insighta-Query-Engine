# Insighta Query Engine

A demographic intelligence API built with Node.js, Express, and MongoDB.
Supports advanced filtering, sorting, pagination, and natural language search.

## Base URL
```
https://your-deployed-url.com
```

## Endpoints

### GET /api/profiles
Returns profiles with optional filtering, sorting, and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| gender | string | male or female |
| age_group | string | child, teenager, adult, senior |
| country_id | string | ISO 2-letter code (NG, KE, GH) |
| min_age | number | Minimum age (inclusive) |
| max_age | number | Maximum age (inclusive) |
| min_gender_probability | number | Minimum confidence score (0-1) |
| min_country_probability | number | Minimum confidence score (0-1) |
| sort_by | string | age, created_at, gender_probability |
| order | string | asc or desc (default: desc) |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 10, max: 50) |

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc
```

---

### GET /api/profiles/search
Natural language search endpoint.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| q | string | Plain English query (required) |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 10, max: 50) |

**Example:**
```
GET /api/profiles/search?q=young males from nigeria
```

---

## Natural Language Parser

### How It Works

The parser processes plain English queries through sequential rule-based steps:

1. **Normalize** — lowercase the entire query
2. **Gender detection** — scan for gender keywords using word boundaries
3. **Age group detection** — scan for age group keywords
4. **"young" keyword** — maps to age range 16–24
5. **Range detection** — extract numbers from patterns like "above 30"
6. **Country detection** — match country names against ISO code map (longest match first)
7. **Validation** — if nothing was interpreted, return error

### Supported Keywords

**Gender:**
```
male, males, man, men, boy, boys
female, females, woman, women, girl, girls
```

**Age Groups:**
```
child, children, kid, kids
teenager, teenagers, teen, teens, adolescent
adult, adults
senior, seniors, elderly, old
```

**Special Age Keywords:**
```
young → age 16–24
```

**Age Range Patterns:**
```
above X, over X, older than X, greater than X → min_age = X
below X, under X, younger than X, less than X → max_age = X
between X and Y → min_age = X, max_age = Y
aged X, age X → min_age = X
```

**Countries (sample):**
```
nigeria → NG       kenya → KE        ghana → GH
ethiopia → ET      tanzania → TZ     uganda → UG
south africa → ZA  ivory coast → CI  and 40+ more
```

### Example Mappings

| Query | Filter Applied |
|---|---|
| young males | gender=male, age 16–24 |
| females above 30 | gender=female, min_age=30 |
| people from nigeria | country_id=NG |
| adult males from kenya | gender=male, age_group=adult, country_id=KE |
| male and female teenagers above 17 | age_group=teenager, min_age=17 |
| seniors under 80 | age_group=senior, max_age=80 |

---

## Parser Limitations

- **No fuzzy matching** — typos like "nigeira" or "femail" return an error
- **No synonym support** — "elderly men" works but "aged gentlemen" does not
- **No compound countries beyond the hardcoded list** — unlisted countries return no country filter
- **"young" is a parsing-only concept** — it maps to 16–24 but is not a stored age_group value
- **min_age > max_age not validated** — passing "between 50 and 20" returns 0 results silently
- **No negation** — "not from nigeria" is not supported
- **No OR logic** — "males or females from kenya" applies no gender filter, not both
- **Single language only** — French, Swahili, or other language queries are not supported

---

## Error Responses

All errors follow this structure:
```json
{ "status": "error", "message": "<description>" }
```

| Code | Meaning |
|---|---|
| 400 | Missing or empty parameter |
| 422 | Invalid parameter value |
| 404 | Route not found |
| 500 | Internal server error |

---

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your MONGODB_URI and PORT

# Seed the database
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- UUID v7 for primary keys