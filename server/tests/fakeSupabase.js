/**
 * tests/fakeSupabase.js
 * -----------------------------------------------------------------------
 * An in-memory stand-in for the two Supabase clients in
 * config/supabaseClient.js, used only by the automated API tests.
 *
 * The API tests send real HTTP requests through the real Express app,
 * routes, auth middleware and controllers. Only the database and Supabase
 * Auth are replaced, so the tests run in a second with no network and
 * never touch the production data. Each test file starts from an empty
 * store (reset() in beforeEach).
 *
 * It implements just the parts of the supabase-js query builder that the
 * controllers use: from().select/insert/update/delete, .eq(), .order(),
 * .single(), and awaiting the result as { data, error, count }.
 *
 * Source: supabase-js query builder methods (select, insert, update,
 * delete, eq, order, single) - https://supabase.com/docs/reference/javascript/select
 * -----------------------------------------------------------------------
 */

import crypto from "crypto";

const state = {
  tables: { projects: [], users: [] },
  authUsers: [], // { id, email, password }
  recoveryTokens: new Map(), // token -> user id
  failInsertInto: null, // table name whose next insert should fail
  resetEmails: [], // { email, redirectTo }
};

export function reset() {
  state.tables = { projects: [], users: [] };
  state.authUsers = [];
  state.recoveryTokens = new Map();
  state.failInsertInto = null;
  state.resetEmails = [];
}

class Query {
  constructor(table) {
    this.table = table;
    this.op = null;
    this.payload = null;
    this.filters = [];
    this.isSingle = false;
    this.countRequested = false;
    this.orderBy = null;
    this.columns = null; // null means every column
  }

  select(columns = "*") {
    if (!this.op) this.op = "select"; // after insert/update it just means "return the rows"
    // Like Supabase, return only the columns asked for.
    this.columns = columns === "*" ? null : columns.split(",").map((c) => c.trim());
    return this;
  }

  pick(row) {
    if (!this.columns) return { ...row };
    return Object.fromEntries(this.columns.map((c) => [c, row[c]]));
  }
  insert(row) {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  update(changes) {
    this.op = "update";
    this.payload = changes;
    return this;
  }
  delete(options = {}) {
    this.op = "delete";
    this.countRequested = options.count === "exact";
    return this;
  }
  eq(column, value) {
    this.filters.push([column, value]);
    return this;
  }
  order(column, { ascending = true } = {}) {
    this.orderBy = { column, ascending };
    return this;
  }
  single() {
    this.isSingle = true;
    return this;
  }

  // Awaiting the builder runs the query, the same way supabase-js does.
  then(resolve, reject) {
    return Promise.resolve(this.run()).then(resolve, reject);
  }

  matches(row) {
    return this.filters.every(([column, value]) => row[column] === value);
  }

  one(rows) {
    if (rows.length !== 1) {
      return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
    }
    return { data: this.pick(rows[0]), error: null };
  }

  run() {
    const rows = state.tables[this.table];

    if (this.op === "insert") {
      if (state.failInsertInto === this.table) {
        state.failInsertInto = null;
        return { data: null, error: { message: "simulated insert failure" } };
      }
      const now = new Date().toISOString();
      const row = {
        project_id: crypto.randomUUID(),
        share_token: null,
        is_shared: false,
        created_at: now,
        updated_at: now,
        ...this.payload,
      };
      rows.push(row);
      return this.isSingle ? { data: this.pick(row), error: null } : { data: [this.pick(row)], error: null };
    }

    const matched = rows.filter((row) => this.matches(row));

    if (this.op === "update") {
      matched.forEach((row) => Object.assign(row, this.payload));
      return this.isSingle ? this.one(matched) : { data: matched.map((r) => this.pick(r)), error: null };
    }

    if (this.op === "delete") {
      state.tables[this.table] = rows.filter((row) => !this.matches(row));
      return { data: null, error: null, count: this.countRequested ? matched.length : null };
    }

    // select
    const result = [...matched];
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result.sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1));
    }
    return this.isSingle ? this.one(result) : { data: result.map((r) => this.pick(r)), error: null };
  }
}

function findAuthUser(id) {
  return state.authUsers.find((u) => u.id === id);
}

export const supabase = {
  from: (table) => new Query(table),
  auth: {
    admin: {
      async createUser({ email, password }) {
        if (state.authUsers.some((u) => u.email === email)) {
          return { data: null, error: { message: "A user with this email address has already been registered" } };
        }
        const user = { id: crypto.randomUUID(), email, password };
        state.authUsers.push(user);
        return { data: { user: { id: user.id, email } }, error: null };
      },
      async deleteUser(id) {
        state.authUsers = state.authUsers.filter((u) => u.id !== id);
        return { data: null, error: null };
      },
      async updateUserById(id, { password }) {
        const user = findAuthUser(id);
        if (!user) return { data: null, error: { message: "User not found" } };
        user.password = password;
        return { data: { user: { id, email: user.email } }, error: null };
      },
    },
  },
};

export const supabaseAuth = {
  auth: {
    async signInWithPassword({ email, password }) {
      const user = state.authUsers.find((u) => u.email === email && u.password === password);
      if (!user) return { data: { user: null }, error: { message: "Invalid login credentials" } };
      return { data: { user: { id: user.id, email } }, error: null };
    },
    async resetPasswordForEmail(email, options = {}) {
      state.resetEmails.push({ email, redirectTo: options.redirectTo });
      return { data: {}, error: null };
    },
    async getUser(token) {
      const id = state.recoveryTokens.get(token);
      const user = id && findAuthUser(id);
      if (!user) return { data: { user: null }, error: { message: "invalid JWT" } };
      return { data: { user: { id: user.id, email: user.email } }, error: null };
    },
  },
};

// ---- helpers for setting up test data directly -------------------------

export function addAuthUser(email, password) {
  const user = { id: crypto.randomUUID(), email, password };
  state.authUsers.push(user);
  state.tables.users.push({ user_id: user.id, email });
  return user;
}

export function issueRecoveryToken(userId) {
  const token = `recovery-${crypto.randomUUID()}`;
  state.recoveryTokens.set(token, userId);
  return token;
}

export function addProject(fields) {
  const now = new Date().toISOString();
  const row = {
    project_id: crypto.randomUUID(),
    name: "Test project",
    tool_type: "ohm",
    project_data: { voltage: 12, current: 2 },
    share_token: null,
    is_shared: false,
    created_at: now,
    updated_at: now,
    ...fields,
  };
  state.tables.projects.push(row);
  return row;
}

export { state };
