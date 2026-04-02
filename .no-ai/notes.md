- i asked the AI to list frames installed and it decided at that moment it needed to refresh its list, but the startup script _worked_ so it shouldn't have had to do this. So, I updated the shell script so that the startup-injected context explicitly told the agent that it had the exhaustive list. Afterwards, the agent did not refresh the list - it believed the instruction.
- Mentality is like, a skill is a capability that an agent can use, an agent is defined by its behavior and area of expertise (through prompt/context files), frames are self-contained pre-packaged procedures, roles within those frames define an agent's participation and interactions. What is an agent's responsibility while acting as that role? What is it supposed to do and NOT do?
  - an engineer role comes in, writes some code, flags design questions as needing to be answered by the designer, and they're done. maybe files a proposal for the architect
- how do frames interface with each other? 
  - i want a proposals frame that just handles the design process and a roadmap frame that handles the implementation, but how do i use both of them if they're self-contained and isolated?
  - frame-to-frame communication
- are roles a useful construct? how will custom agents from other people play with the roles?
  - we don't go with roles to start. we focus on does the process work and how does it work best
- identifying when the AI has enough context, or identifying what context the AI needs
- instructions contained through indirection from startup context is weak. instruction in CLAUDE.md->BOOTSTRAP.md->FRAME.md(here) could not be followed without very very clear prompting. so the distance between the user's prompt and the instruction plays a role in whether the agent will make the connection. it helps to be explicit and up front (literally)
- this was nice to see from the architect: "Note that the ux-designer still needs to review before it can move to accepted — I must not move it unilaterally."
- [FAILED HANDOFF] ugh the architect answered the open questions in the chat but didn't autonomously update them.
- when do transition points happen? how do you recognize a transition point? what do you do after following the guidelines at that transition point?
- boundaries defined in FRAME-v1.yml are being respected by the architect
- the architect recognized a "state change" was happening (he was going into the 'review' state) and loaded the corresponding behavior. Yaml works??



The things we need (somewhere)
1. The roles that are involved
   1. What they do, what they don't do
   2. What they know
   3. This is `FRAME.md` and `roles/` together
2. The stages that make up the full frame
   1. design, execution, maintenance
   2. This is `FRAME.md` (high level) AND...?
3. How and when to transition between frames
4. How and when to raise questions to other roles or the user

If you can recognize what stage you are at, then you can orient around what input and output and transitions are there. It's a state machine.