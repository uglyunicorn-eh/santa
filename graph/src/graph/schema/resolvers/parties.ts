import { ObjectId } from 'bson';
import { Db } from "mongodb";
import _ from '../../../utils/resolvable';
import { createPartyInputSchema, joinPartyInputSchema } from "../../../validationSchemas/parties";
import { ICreatePartyInput, IJoinPartyInput, IMutationPayload } from "../interfaces";
import { randomString } from '../../../lib/utils/strings/random';
import { partyEntityToNode } from './party';
import NodeId from '../../../lib/utils/nodeId';
import { IPartyEntity } from 'src/db/interfaces';

const generatePartySlug = async (db: Db) => {
  const PartyCollection = db.collection('Party');
  while (true) {
    const slug = randomString(5, 'QWERTYUIPASDFGHJKLZXCVBNMO');
    if (await PartyCollection.findOne({slug})) {
      continue;
    }
    return slug;
  }
};

export default {
  parties: () => ({

    createParty: _(createPartyInputSchema)(async (input: ICreatePartyInput, {db, user}) => {
      const entity = {
        _id: new ObjectId(),
        host: user!._id,
        name: input.name,
        password: input.password,
        slug: await generatePartySlug(db),
        participantCount: 1,
      };
      await db.collection('Party').insertOne(entity);
      await db.collection('PartyMembership').insertOne({
        party: entity._id,
        member: user!._id,
        name: user!.name,
      });
      return {
        node: await partyEntityToNode(db, entity, user),
      };
    }),

    joinParty: _(joinPartyInputSchema)(async ({party, password}: IJoinPartyInput, {db, user}) => {
      if (user === null) {
        return {
          status: 'error',
          userErrors: [{
            fieldName: null,
            messages: ['You must be logged in before joining the party.'],
          }],
        } as IMutationPayload;
      }

      const partyNodeId = NodeId.fromString(party);
      if (partyNodeId.kind !== 'Party') {
        return {
          userErrors: [{
            fieldName: 'party',
            messages: ['Unknown input type. Must be Party.'],
          }],
        };
      }
      const partyEntity = await db.collection('Party').findOne({_id: partyNodeId.id}) as (IPartyEntity | null);
      if (partyEntity === null) {
        return {
          userErrors: [{
            fieldName: 'party',
            messages: ['Party does not exist.'],
          }],
        };
      }

      if (await db.collection('PartyMembership').findOne({party: partyEntity._id, member: user._id})) {
        return {
          node: await partyEntityToNode(db, partyEntity, user),
        };
      }

      if ((partyEntity.password || '').toUpperCase() !== (password || '').toUpperCase()) {
        return {
          userErrors: [{
            fieldName: 'password',
            messages: ["Hmm... Seems you've got a wrong secret phrase. Please try a different one or ask your frient for a hint."],
          }],
        };
      }

      await db.collection('Party').updateOne({_id: partyEntity._id}, {$inc: {participantCount: 1}});
      await db.collection('PartyMembership').insertOne({
        party: partyEntity._id,
        member: user!._id,
      });

      return {
        node: await partyEntityToNode(db, partyEntity, user),
      };
    }),

  }),
};
