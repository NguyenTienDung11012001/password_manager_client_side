// src/services/gistService.js

const GIST_API_URL = 'https://api.github.com/gists/';

/**
 * A service class to interact with the GitHub Gist API.
 */
export class GistService {
  #gistId;
  #githubToken;
  #fileName; // The filename within the Gist to store our data

  /**
   * @param {string} gistId - The ID of the GitHub Gist.
   * @param {string} githubToken - The GitHub Personal Access Token.
   */
  constructor(gistId, githubToken) {
    if (!gistId || !githubToken) {
      throw new Error('Gist ID and GitHub Token are required.');
    }
    this.#gistId = gistId;
    this.#githubToken = githubToken;
    // We'll store our content in a file named 'password-data.json' within the Gist.
    // This name is arbitrary but must be consistent.
    this.#fileName = 'password-data.json';
  }

  /**
   * Fetches the encrypted payload from the GitHub Gist.
   * @returns {Promise<string>} - The base64 encrypted payload.
   */
  async fetchData() {
    try {
      const response = await fetch(`${GIST_API_URL}${this.#gistId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.#githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }

      const gist = await response.json();

      if (!gist.files || !gist.files[this.#fileName]) {
        // This likely means it's a new or empty Gist.
        // We can create the file on the first update.
        console.warn(`File "${this.#fileName}" not found in Gist. It will be created on the first save.`);
        return null;
      }

      const fileContent = JSON.parse(gist.files[this.#fileName].content);
      return fileContent.payload; // Return only the payload as required

    } catch (error) {
      console.error('Failed to fetch data from Gist:', error);
      throw new Error('Could not fetch data from Gist. Check Gist ID, token, and network connection.');
    }
  }

  /**
   * Updates the Gist with a new encrypted payload.
   * @param {string} encryptedPayload - The new base64 encrypted payload.
   * @returns {Promise<void>}
   */
  async updateData(encryptedPayload) {
    const content = JSON.stringify({
      version: 1,
      updated_at: new Date().toISOString(),
      payload: encryptedPayload,
    });

    const body = {
      files: {
        [this.#fileName]: {
          content: content,
        },
      },
    };

    try {
      const response = await fetch(`${GIST_API_URL}${this.#gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.#githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }

    } catch (error) {
      console.error('Failed to update Gist:', error);
      throw new Error('Could not save data to Gist. Check Gist ID, token, and network connection.');
    }
  }
}
