import * as request from 'request';
import * as mdj from 'mdjotter';

export interface MDJotterOptions {
    username: string;
    password: string;
    hostname: string;
    port: number;
}

export interface IRequestOptions<T> extends request.CoreOptions {
    body?: T;
}

const DEFAULT_OPTIONS: Partial<MDJotterOptions> = {
    hostname: 'localhost',
    port: 3000
}

export class MDJotter {
    options: MDJotterOptions;
    endpoint: string;
    token: string = '';

    constructor(options: MDJotterOptions) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options
        }
        this.endpoint = `http://${this.options.hostname}:${this.options.port}`;
    }

    private request<I, O>(url: string, options?: IRequestOptions<I>): Promise<O> {
        if (!options) {
            options = {};
        }

        let finalOptions: request.CoreOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-token': this.token
            },
            ...options
        }

        if (finalOptions.body && !(typeof finalOptions.body === 'string')) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        return new Promise((resolve, reject) => {
            request(`${this.endpoint}/${url}`, finalOptions, (err, response) => {
                if (err) return reject (err);

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`API returned response of ${response.statusCode}`));
                }

                try {
                    resolve(JSON.parse(response.body))
                } catch {
                    resolve(response.body);
                }
            });
        })
    }

    private userRequest<I, O>(url: string, options?: IRequestOptions<I>): Promise<O> {
        return this.request<I, O>(`users/${this.options.username}/${url}`, options);
    }

    // User

    async connect() {
        let response = await this.userRequest<mdj.ILoginBody, mdj.ILoginResponse>(`login`, {
            method: 'POST',
            body: {
                password: this.options.password
            }
        });

        this.token = response.token;

        return this;
    }

    // Containers

    async createContainer (params: mdj.ICreateContainerParams) {
        return this.userRequest<mdj.ICreateContainerParams, mdj.RawContainerInstance>(`containers`, {
            method: 'POST',
            body: params
        });
    }

    async getRootContainers() {
        return this.userRequest<{}, mdj.RawContainerInstance[]>(`containers`);
    }

    async getChildren (parent: number): Promise<mdj.IRawContainerChildren> {
        return this.userRequest<{}, mdj.IRawContainerChildren>(`containers/${parent}/children`)
    }

    async updateContainer (containerId: number, attributes: Partial<mdj.ICreateContainerParams>) {
        return this.userRequest<Partial<mdj.ICreateContainerParams>, mdj.RawContainerInstance>(`containers/${containerId}`, {
            method: 'PATCH',
            body: attributes
        })
    }

    async deleteContainer (containerId: number) {
        return this.userRequest(`containers/${containerId}`, {
            method: 'DELETE'
        });
    }

    // Notes

    async createNote (params: mdj.ICreateNoteParams) {
        return this.userRequest<mdj.ICreateNoteParams, mdj.RawNoteInstance>(`notes`, {
            method: 'POST',
            body: params
        });
    }

    async getNote (noteId: number) {
        let note = await this.userRequest<{}, mdj.RawNoteInstance>(`notes/${noteId}`);

        if (!note.contents) note.contents = '';

        return note;
    }

    async updateNote (noteId: number, attributes: Partial<mdj.ICreateNoteParams>) {
        return this.userRequest<Partial<mdj.ICreateNoteParams>, mdj.NoteInstance>(`notes/${noteId}`, {
            method: 'PATCH',
            body: attributes
        });
    } 

    async deleteNote (noteId: number) {
        return this.userRequest(`notes/${noteId}`, {
            method: 'DELETE'
        });
    }

    async searchNotes (query: string) {
        return this.userRequest<mdj.ISearchBody, mdj.RawNoteInstance[]>(`notes/search`, {
            method: 'POST',
            body: { query }
        })
    }
}