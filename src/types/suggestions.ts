export interface Vote {
    VoterID: string;
    Vote: 'upvote' | 'downvote';
}

export interface SuggestionData {
    MessageID: string;
    Upvotes: number;
    Downvotes: number;
    Votes: Vote[];
}