import { Saito } from "../../apps/core";
import Block from "./block";

export default class Blockring {
  public app: Saito;
  public ring_buffer_length: number;
  public ring: Array<{
    block_hashes: Array<string>;
    block_ids: Array<bigint>;
    lc_pos: number;
  }>;
  public is_empty: boolean;
  public lc_pos: number;
  public debugging: boolean;

  constructor(app: Saito, genesis_period: bigint) {
    this.app = app;

    //
    // consensus variables
    //
    this.ring_buffer_length = Number(genesis_period * BigInt(2));
    this.ring = new Array<any>(this.ring_buffer_length);

    for (let i = 0; i < this.ring_buffer_length; i++) {
      this.ring[i] = {
        block_hashes: new Array<string>(),
        block_ids: new Array<bigint>(),
        lc_pos: 0,
      };
    }

    this.is_empty = true;
    this.lc_pos = 0;
    this.debugging = false;
  }

  addBlock(block) {
    const insert_pos  = Number(block.returnId() % BigInt(this.ring_buffer_length));
    const block_id : bigint = block.returnId();
    const block_hash = block.returnHash();
    if (this.debugging){
      console.log("adding block hash to blockring: " + block_hash);      
    }

    if (!this.containsBlockHashAtBlockId(block_id, block_hash)) {
      this.ring[insert_pos].block_hashes.push(block_hash);
      this.ring[insert_pos].block_ids.push(block_id);
      if (this.debugging){
        console.log("and added!");
      }
    }
  }

  containsBlockHashAtBlockId(block_id : bigint, block_hash) {
    const insert_pos = Number(block_id % BigInt(this.ring_buffer_length));
    if (this.debugging){
      console.log("does include? " + this.ring[insert_pos].block_hashes.includes(block_hash));
    }
    return this.ring[insert_pos].block_hashes.includes(block_hash);
  }

  deleteBlock(block: Block) {
    console.debug("blockring.deleteBlock : " + block.returnId() + " : " + block.returnHash());
    const insert_pos  = Number(block.returnId() % BigInt(this.ring_buffer_length));
    const block_id = block.returnId();
    const block_hash = block.returnHash();

    if (this.containsBlockHashAtBlockId(block_id, block_hash)) {
      let new_block_hashes = [];
      let new_block_ids = [];
      let idx_loop = 0;
      let new_lc_pos = 0;

      for (let i = 0; i < this.ring[insert_pos].block_hashes.length; i++) {
        if (
          this.ring[insert_pos].block_ids[i] !== block_id ||
          this.ring[insert_pos].block_hashes[i] !== block_hash
        ) {
          new_block_hashes.push(this.ring[insert_pos].block_hashes[i]);
          new_block_ids.push(this.ring[insert_pos].block_ids[i]);
          if (this.lc_pos == i) {
            new_lc_pos = idx_loop;
          }
          idx_loop += 1;
        }
      }

      this.ring[insert_pos].block_hashes = new_block_hashes;
      this.ring[insert_pos].block_ids = new_block_ids;
      this.ring[insert_pos].lc_pos = new_lc_pos;
    }
  }

  isEmpty() {
    return this.is_empty;
  }

  print() {
    // console.log("lcpos = ",this.lc_pos);
    // console.log("length = ",this.ring_buffer_length);
    let idx : number = this.lc_pos % this.ring_buffer_length;
    let cont = true;
    for (let i = 0; i < this.ring_buffer_length; i++) {
      let index = (idx + this.ring_buffer_length) % this.ring_buffer_length;
      if (this.ring[index].block_hashes.length > 0) {
        if (this.debugging){
          console.log(
            "------- block " +
            this.ring[index].block_ids[this.ring[index].lc_pos] +
            ": " +
            this.ring[index].block_hashes[this.ring[index].lc_pos]
          );
        }
        idx--;
      }
    }
  }

  onChainReorganization(block_id:bigint, block_hash, lc) {
    const insert_pos = Number(block_id % BigInt(this.ring_buffer_length));
    if (!this.ring[insert_pos]) {
      /*console.trace(
        "block id : " +
          block_id +
          " insert_pos : " +
          insert_pos +
          " doesn't have an entry in block ring"
      );*/
      return;
    }

    for (let i = 0; i < this.ring[insert_pos].block_hashes.length; i++) {
      if (this.ring[insert_pos].block_hashes[i] === block_hash) {
        this.ring[insert_pos].lc_pos = i;
      }
    }

    if (lc) {
      this.lc_pos = insert_pos;
    } else {
      let previous_insert_pos = insert_pos - 1;
      if (previous_insert_pos < 0) {
        previous_insert_pos = this.ring_buffer_length - 1;
      }
      if (this.ring[previous_insert_pos].block_hashes.length > 0) {
        this.lc_pos = previous_insert_pos;
      }
    }
  }

  returnBlockHashesAtBlockId(block_id:bigint) {
    const insert_pos = Number(block_id % BigInt(this.ring_buffer_length));
    let v = [];
    for (let i = 0; i < this.ring[insert_pos].block_hashes.length; i++) {
      v.push(this.ring[insert_pos].block_hashes[i]);
    }
    return v;
  }

  returnLongestChainBlockHashAtBlockId(block_id: bigint) {
    const insert_pos = Number(BigInt(block_id) % BigInt(this.ring_buffer_length));
    if (this.ring[insert_pos].lc_pos < this.ring[insert_pos].block_hashes.length) {
      return this.ring[insert_pos].block_hashes[this.ring[insert_pos].lc_pos];
    }
    return "";
  }

  returnLatestBlockHash() {
    if (this.lc_pos == 0 && this.isEmpty()) {
      return "";
    }
    if (this.ring[this.lc_pos].block_hashes.length > this.ring[this.lc_pos].lc_pos) {
      return this.ring[this.lc_pos].block_hashes[this.ring[this.lc_pos].lc_pos];
    }
    return "";
  }

  returnLatestBlockId():bigint {
    if (this.lc_pos == 0) {
      if (this.ring[0].block_ids.length > 0) {
        return this.ring[0].block_ids[this.ring[0].lc_pos];
      } else {
        return BigInt(0);
      }
    }
    if (this.ring[this.lc_pos].block_ids.length > this.ring[this.lc_pos].lc_pos) {
      return this.ring[this.lc_pos].block_ids[this.ring[this.lc_pos].lc_pos];
    }
    return BigInt(0);
  }

  returnLatestBlock(): Block | null {
    const block_hash = this.returnLatestBlockHash();
    if (this.app.blockchain.isBlockIndexed(block_hash)) {
      return this.app.blockchain.blocks.get(block_hash);
    }
    return null;
  }

  returnLongestChainBlockHashByBlockId(block_id: bigint): string {
    const insert_pos = Number(block_id % BigInt(this.ring_buffer_length));

    if (this.ring[insert_pos].block_hashes.length > this.ring[insert_pos].lc_pos) {
      if (this.ring[insert_pos].block_hashes.length > 0) {
        return this.ring[insert_pos].block_hashes[this.ring[insert_pos].lc_pos];
      }
    }
    return "";
  }
}
