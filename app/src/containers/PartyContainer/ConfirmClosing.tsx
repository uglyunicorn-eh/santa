import * as Bulma from 'bloomer';
import React from 'react';
import { MessageBox, MessageBoxContent } from '../MessageBox';
import { Button } from '../../components';

import './ConfirmClosing.css';

export default class ConfirmClosing extends MessageBoxContent {
  public static async showMessageBox(): Promise<boolean> {
    return await MessageBox.showMessageBox({
      title: 'Here we GO-O-O-O!!!',
      content: props => <ConfirmClosing {...props} />,
      width: 700,
      className: 'party-box confirm-closing-box',
    });
  }

  public render() {
    const onCancel = () => this.props.messageBox!.done();
    return (
      <>
        <Bulma.Content className="confirm-closing-box-content">
          <p>Are you ready for rock'n'roll? Before you continue please note:</p>
          <ul>
            <li>Everybody will receive a random name to prepare a gift to;</li>
            <li>No new people can join the party after this;</li>
            <li>This cannot be undone.</li>
          </ul>
          <p>Let's the show begin!</p>
        </Bulma.Content>
        <div className="buttons is-pulled-right">
          <Bulma.Button onClick={onCancel}>Not ready yet...</Bulma.Button>
          <Button isColor="primary">&#x1F92A; Can't wait any longer!</Button>
        </div>
      </>
    );
  }
}
