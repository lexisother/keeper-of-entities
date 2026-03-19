// Copyright (C) 2019-2020 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as formatterCore from './formatter/core';
import {installBasic} from './formatter/lib-basic';
import {type VMContext, installDiscord} from './formatter/lib-discord';

// This file serves as a wrapper to minimize the used API of the formatter.
// The formatter itself is customizable for code structure reasons.

export { VMContext };

export class VM extends formatterCore.VM {
    public readonly context: VMContext;
    public constructor(context: VMContext) {
        super();
        this.context = context;
        installBasic(this);
        installDiscord(this, context);
    }
}

/// Runs a line of the bot's format-syntax.
/// Credit for the theory behind the design goes in part to LISP, PHP, and in part to (er, Lanterns, what's the name of your group again?)'s bot '42'.
///
/// Essentially, this is like PHP & 42 in operating principles;
///  without proper encapsulation, text goes to 'standard output'.
/// The return value of the function is the text,
///  which also makes any formatting directive implicitly usable in other ways if the system gets more complex.
///
/// The VM within that, above, is LISP-style (different data structure though).
///
/// The special sequences are:
/// %: Escape character. Will escape anything, except ( outside of a list system.
/// %%: How to write '%'.
/// %(...):
///  Execute custom format insertion. The contents of this are a recursive list.
///  Within this, a separate set of syntax rules are defined.
///  All that really matters here is that %(emote leaCheese) gives you <:leaCheese:257888171772215296>.
///  Any value can be prefixed with ' to wrap it as so: (%' list)
///  Also, " is pretty much a togglable escape.
/// /leaCheese/: Shows the leaCheese emote. For compatibility with old .cc say
/// //: Repeated verbatim, escapes text until next space. Used to keep URLs happy
export const {runFormat} = formatterCore;
