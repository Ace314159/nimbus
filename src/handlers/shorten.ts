// interface ShortenParams {
//     path: string
//     url: string
// }

const shortenRegex = /(?<path>\w*)\s+(?<url>[\S]+)/;

const parseShortenString = (text: string): RegExpMatchArray | null => {
	return text.trim().match(shortenRegex);
};

const postNewUrl = (path: string, url: string): Promise<Response> => {
	const fetchUrl = `https://vhl.ink`;
	const headers = new Headers({
		'Content-Type': 'application/x-www-form-urlencoded',
		'x-preshared-key': SECRET_KEY,
	});
	return fetch(`${fetchUrl}?${new URLSearchParams({ url, path }).toString()}`, {
		headers,
	});
};

const compact = (array: string[]) => array.filter(el => el);

export const constructSlackMessage = (text: string) => {
	const text_lines = [text];

	return [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: compact(text_lines).join('\n'),
			},
		},
	];
};

/**
 * Handles shortening links. Expects the text to look like:
 * `/shorten <path> <url>`, and result in `vhl.ink/path`
 */
export default async (request: Request) => {
	try {
		const queryParams = new URL(request.url).searchParams;
		const text = queryParams.get('text');

		// Ensure that we process a valid string
		if (typeof text === 'string') {
			const params: { [key: string]: string } | undefined = parseShortenString(
				text,
			)?.groups;
			const path: string | undefined = params?.path;
			const url: string | undefined = params?.url;

			if (path && url) {
				const response = await postNewUrl(path, url);
				const res = await response.json();

				const blocks = constructSlackMessage(text);

				return new Response(
					JSON.stringify({
						blocks,
						response_type: 'in_channel',
					}),
					{ headers: { 'Content-type': 'application/json' } },
				);
			}

			throw new Error();
		}
		throw new Error('Expected a string to be included in request.');
	} catch (err) {
		const errorText =
			'The request failed, please ensure that you are supplying options in the format `/shorten <path> <url>`.';
		return new Response(err.message || errorText);
	}
};
