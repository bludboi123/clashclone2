import { ALL_CARD_IDS, STARTER_DECK } from "@clash-clone/shared";

// Shuffles a copy of the starter deck into a draw queue.
export function shuffleDeck(source: string[] = STARTER_DECK): string[] {
  const deck = [...source];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Classic 4-card-hand + 1-card-preview cycle, backed by an 8-card deck
// queue. Playing a card pulls it out of wherever it sits in the queue
// and sends it to the back, so it comes back up in ~2 cycles.
export class CardCycle {
  private queue: string[];

  constructor(deck: string[] = STARTER_DECK) {
    this.queue = shuffleDeck(deck.length === 8 && deck.every((id) => ALL_CARD_IDS.includes(id)) ? deck : STARTER_DECK);
  }

  get hand(): string[] {
    return this.queue.slice(0, 4);
  }

  get next(): string {
    return this.queue[4];
  }

  // Returns false if cardId isn't currently in hand (client desync / cheat attempt).
  play(cardId: string): boolean {
    const idx = this.queue.indexOf(cardId);
    if (idx < 0 || idx > 3) return false;
    const [card] = this.queue.splice(idx, 1);
    this.queue.push(card);
    return true;
  }
}
