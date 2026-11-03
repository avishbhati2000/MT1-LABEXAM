# Employee Task Management

This project contains two independent applications, as required by the lab:

- `httpServer.js` uses Node's built-in HTTP and FS modules on port **3000**.
- `expressApp.js` provides an in-memory Express REST API on port **4000**.
- `public/index.html` is served from `/home` and uses the Express API for task management.

## Run

Install dependencies once:

```sh
npm install
```

In separate terminals, start both servers:

```sh
npm run start:http
npm run start:api
```

Open [http://localhost:3000/home](http://localhost:3000/home) for the task manager. The HTTP server also serves `/`, `/tasks`, and `/about`. Express starts with three sample tasks.

## HTTP server routes

| Method | Path | Result |
|---|---|---|
| GET | `/` | Welcome page |
| GET | `/tasks` | All in-memory tasks as JSON |
| GET | `/about` | Application information |
| GET | `/home` | `public/index.html`, read with the FS module |
| POST | `/add-task` | Add a task from a JSON body |

`POST /add-task` requires a positive integer `id` and non-empty `taskName`, `assignedTo`, and `status` strings.

## Express API

| Method | Path | Result |
|---|---|---|
| GET | `/tasks` | List tasks |
| GET | `/tasks/:id` | Get one task |
| POST | `/tasks` | Create a task (201) |
| PUT | `/tasks/:id` | Update supplied task fields |
| DELETE | `/tasks/:id` | Delete a task |

New tasks require `id`, `taskName`, `assignedTo`, `status`, and `priority`. IDs must be unique. Records are stored in memory and reset to the sample data when the API restarts. Requests and errors return JSON; missing tasks return 404.

Run the automated route and validation checks with:

```sh
npm test
```

## Screenshots and GitHub submission

Save genuine screenshots of the HTTP server routes, the `/home` page, the running Express server, and EchoAPI GET/POST/PUT/DELETE results in `screenshots/`. Include the GitHub repository and commit-history screenshots there as well. This workspace has not been connected to a GitHub remote; create the `MT1-LABEXAM` repository, push this project, and capture its commit history after configuring your GitHub credentials and remote.
