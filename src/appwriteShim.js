// Universele "Appwrite compatibility shim" voor de kleine CTF-frontends
// (ctfveiligheid, ctfStamgastenformulier, ctfvrijwilligersformulier,
//  ctfpublieksonderzoek, ctfarchief, ctfimpact, ctfmakersformulier).
//
// Vervang in elke app de regel
//     import { Client, Databases, ID, Query } from 'appwrite';
// door
//     import { Client, Databases, ID, Query } from './appwriteShim';
//
// Zonder andere wijzigingen blijven alle hardgecodeerde Appwrite collection-ID's
// werken: de shim mapt ze automatisch naar onze publieke Laravel API.
//
// Backend URL kan via env: REACT_APP_API_URL of VITE_API_URL (Vite-apps).

const FALLBACK_API_URL = 'https://backend.cafetheaterfestival.nl';
const API_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
    FALLBACK_API_URL;

// Mapping: oude Appwrite collection-ID's en namen → onze publieke resource-paden.
const COLLECTION_TO_RESOURCE = {
    '68873b53001cd7a02043': 'contacts',
    '68873b5f0032519e7321': 'companies',
    '68873b6500074288e73d': 'performances',
    '68878ee7000cb07ef9e7': 'locations',
    '68878f2d0020be3a7efd': 'executions',
    '688798900022cbda4ec0': 'events',
    '6888811300080673fa2c': 'settings',
    '68945b4f000e7c3880cb': 'info',
    '68948a4b002d7cda6919': 'nieuws',
    '68948b97003e5aa5068c': 'sponsors',
    '6894d367002bf2645148': 'toegankelijkheid',
    '6899f3390009b108e10f': 'veiligheid',
    '689ded8900383f2d618b': 'marketing',
    '68a174c900178a2511e7': 'stamgast',
    '68aa2809001c0741dd61': 'merch',
    '68aa28eb002bc01dcde3': 'orders_merch',
    handleidingen: 'handleidingen',
    contract_templates: 'contract-templates',
    route: 'routes',
    notificaties: 'notificaties',
    publieksonderzoek: 'publieksonderzoek',
    reserveringen: 'reserveringen',
    jaarplanning: 'jaarplanning',
    begroting: 'begrotingen',
    begrotingsregels: 'begrotingsregels',
    functiehuis: 'functiehuis',
    taakbelasting: 'taakbelasting',
    taakbelastingregel: 'taakbelasting-regels',
    app_users: 'app-users',
    waarkomenmakersterecht: 'waar-komen-makers-terecht',
};

function resolveResource(idOrName) {
    return COLLECTION_TO_RESOURCE[idOrName] || idOrName;
}

function wrapDoc(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    const id = doc.id !== undefined ? String(doc.id) : doc.$id;
    return {
        ...doc,
        $id: id,
        $createdAt: doc.created_at || doc.$createdAt,
        $updatedAt: doc.updated_at || doc.$updatedAt,
        $collectionId: '',
        $databaseId: '',
        $permissions: [],
    };
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const text = await res.text();
        const err = new Error(`HTTP ${res.status}: ${text}`);
        err.status = res.status;
        throw err;
    }
    if (res.status === 204) return null;
    return res.json();
}

export class Client {
    setEndpoint() { return this; }
    setProject() { return this; }
}

export class Databases {
    constructor(_client) {}

    async listDocuments(_db, collectionIdOrName, queries = []) {
        const resource = resolveResource(collectionIdOrName);

        // Parse Query-objecten
        let limit = 5000;
        let offset = 0;
        const equalFilters = {};
        const advancedFilters = []; // {op, field, value(s)}
        let orderBy = null;
        let orderDir = null;
        let equalIds = null; // speciale case: Query.equal('$id', [ids])

        (queries || []).forEach(q => {
            if (!q) return;
            switch (q._q) {
                case 'limit': limit = q.value; break;
                case 'offset': offset = q.value; break;
                case 'equal':
                    if (q.field === '$id' || q.field === 'id') {
                        equalIds = Array.isArray(q.value) ? q.value : [q.value];
                    } else {
                        equalFilters[q.field] = q.value;
                    }
                    break;
                case 'between':
                case 'greaterThan':
                case 'lessThan':
                    advancedFilters.push(q);
                    break;
                case 'orderDesc':
                    orderBy = q.field; orderDir = 'desc'; break;
                case 'orderAsc':
                    orderBy = q.field; orderDir = 'asc'; break;
            }
        });

        // Als gefilterd op IDs: haal elk individueel op (eenvoudiger dan multi-id filter op backend).
        if (equalIds && equalIds.length > 0) {
            const results = await Promise.all(
                equalIds.map(id =>
                    apiFetch(`/api/public/${resource}/${id}`).catch(() => null)
                )
            );
            const documents = results.filter(Boolean).map(wrapDoc);
            return { documents, total: documents.length };
        }

        const page = Math.floor(offset / limit) + 1;
        const params = new URLSearchParams({
            per_page: String(limit),
            page: String(page),
            ...Object.fromEntries(
                Object.entries(equalFilters).map(([k, v]) => [k, String(v)])
            ),
        });
        // Advanced filters: zonder backend-ondersteuning haal je alles op en
        // filtert de shim client-side. Backend wel als hij het kent.
        advancedFilters.forEach((f, idx) => {
            if (f._q === 'greaterThan') params.set(`${f.field}_gt`, String(f.value));
            if (f._q === 'lessThan') params.set(`${f.field}_lt`, String(f.value));
            if (f._q === 'between') {
                params.set(`${f.field}_gte`, String(f.value[0]));
                params.set(`${f.field}_lte`, String(f.value[1]));
            }
        });
        if (orderBy) {
            params.set('order_by', orderBy);
            params.set('order_dir', orderDir);
        }
        // Apps die historische executions nodig hebben (archief, impact) sturen
        // automatisch include_past=1 mee. Andere apps krijgen het future-only filter.
        if (resource === 'executions' && typeof window !== 'undefined') {
            const host = window.location?.hostname || '';
            if (host.includes('archief') || host.includes('impact')) {
                params.set('include_past', '1');
            }
        }
        const json = await apiFetch(`/api/public/${resource}?${params.toString()}`);

        let documents = (json.data || []).map(wrapDoc);

        // Client-side filtering voor advanced filters (backend ondersteunt ze nog niet)
        advancedFilters.forEach(f => {
            if (f._q === 'greaterThan') documents = documents.filter(d => d[f.field] > f.value);
            if (f._q === 'lessThan') documents = documents.filter(d => d[f.field] < f.value);
            if (f._q === 'between') {
                documents = documents.filter(d => d[f.field] >= f.value[0] && d[f.field] <= f.value[1]);
            }
        });
        if (orderBy) {
            documents.sort((a, b) => {
                const av = a[orderBy], bv = b[orderBy];
                if (av < bv) return orderDir === 'desc' ? 1 : -1;
                if (av > bv) return orderDir === 'desc' ? -1 : 1;
                return 0;
            });
        }

        return {
            documents,
            total: json.total ?? documents.length,
        };
    }

    async getDocument(_db, collectionIdOrName, id) {
        const resource = resolveResource(collectionIdOrName);
        const json = await apiFetch(`/api/public/${resource}/${id}`);
        return wrapDoc(json.data || json);
    }

    async createDocument(_db, collectionIdOrName, _newId, data) {
        const resource = resolveResource(collectionIdOrName);
        const json = await apiFetch(`/api/public/${resource}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return wrapDoc(json.data || json);
    }

    async updateDocument(_db, collectionIdOrName, id, data) {
        const resource = resolveResource(collectionIdOrName);
        const json = await apiFetch(`/api/public/${resource}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return wrapDoc(json.data || json);
    }
}

export const Query = {
    limit: (n) => ({ _q: 'limit', value: n }),
    offset: (n) => ({ _q: 'offset', value: n }),
    equal: (field, value) => ({ _q: 'equal', field, value }),
    between: (field, from, to) => ({ _q: 'between', field, value: [from, to] }),
    greaterThan: (field, value) => ({ _q: 'greaterThan', field, value }),
    lessThan: (field, value) => ({ _q: 'lessThan', field, value }),
    orderDesc: (field) => ({ _q: 'orderDesc', field }),
    orderAsc: (field) => ({ _q: 'orderAsc', field }),
};

export const ID = {
    unique: () => null,
};

// Functions/ExecutionMethod stubs — niet meer in gebruik (ctfmerch checkout
// loopt nu via /api/public/checkout/merch). Houden we als no-op zodat oude
// `new Functions(client)` regels niet crashen.
export class Functions {
    constructor(_client) {}
    async createExecution() {
        throw new Error('Appwrite Functions zijn vervangen door directe Laravel endpoints.');
    }
}

export const ExecutionMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
};
