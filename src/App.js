import React, { Component } from 'react'
import { API, graphqlOperation } from 'aws-amplify'
import { withAuthenticator } from '@aws-amplify/ui-react'
import { createNote, deleteNote, updateNote } from './graphql/mutations'
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions'
import { listNotes } from './graphql/queries'
import update from 'react-addons-update';
class App extends Component {
  state = {
    id: '',
    note: '',
    notes: []
  }
  
  deleteListener = ( res ) => {
    const noteId = res.value.data.onDeleteNote.id;
    const notes = this.state.notes.filter(n => n.id !== noteId)
    this.setState({ notes })
  }
  
  componentDidMount = () => {
    this.getNotes()
    this.createListener = API.graphql( graphqlOperation( onCreateNote ) )
      .subscribe( {
        next: res => {
          const note = res.value.data.onCreateNote
          const notes = update( this.state.notes, {$push: [note]})
          const updates = { note: '', notes: notes }
          this.setState(updates)
        }
      } )

    this.deleteListener = API.graphql( graphqlOperation( onDeleteNote ) )
      .subscribe( {
        next: res => {
          const noteId = res.value.data.onDeleteNote.id;
          const notes = this.state.notes.filter(n => n.id !== noteId)
          this.setState({ notes })
        }
      } )

    this.updateListener = API.graphql( graphqlOperation( onUpdateNote ) )
      .subscribe( {
        next: res => { 
          const updatedNote = res.value.data.onUpdateNote
          const index = this.state.notes.findIndex( n => n.id ===  updatedNote.id )
          const notes = update( this.state.notes, { [index]: { $set: updatedNote } } )
          const updates = { notes: notes, note: '', id: '' }
          this.setState(updates)
        }
      } )
  }
  
  componentWillUnmount = () => {
    this.createListener.unsubscribe()
    this.deleteListener.unsubscribe()
    this.updateListener.unsubscribe()
  }

  getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes))
    this.setState({ notes: result.data.listNotes.items })
  }

  handleSetNote = ( { note, id } ) => this.setState( { note, id } )

  hasExistingNote = () => {
    const { notes, id } = this.state
    return id ? notes.findIndex(n => n.id === id) > -1 : false
  }

  handleChangeNote = evt =>
    this.setState({
      note: evt.target.value
    })

  handleDeleteNote = async noteId => {
    const input = { id: noteId }
    await API.graphql(graphqlOperation(deleteNote, { input }))
  }

  handleAddNote = async evt => {
    const { notes, note, id } = this.state
    evt.preventDefault()
    if (id && notes.findIndex( n => n.id === id ) > -1)
      return this.handleUpdateNote()
    
    await API.graphql( graphqlOperation( createNote, { input: { note } } ) )
  }

  handleUpdateNote = async () => {
    const { id, note } = this.state
    const input = { id, note }
    await API.graphql(graphqlOperation(updateNote, { input }))
  }

  render () {
    const { id, note, notes } = this.state
    return (
      <div className='flex flex-column items-center justify-center pa3 bg-washed-red'>
        <h1 className='code f2-1'> Notetaker </h1>
        <form onSubmit={this.handleAddNote} className='mb3'>
          <input
            type='text'
            value={note}
            className='pa2 f4'
            placeholder='Write it bitch'
            onChange={this.handleChangeNote}
          />
          <button className='pa2 f4' type='submit'>
            {id ? "Update" : 'Add Note'}
          </button>
        </form>
        <div className='items-left pa3'>
          {notes.map(item => (
            <div className='flex items-left' key={item.id}>
              <li
                onClick={() => this.handleSetNote(item)}
                className='list pa1 f3'>
                {item.note}{' '}
              </li>
              <p
                className='pa1 f7'
                onClick={() => this.handleDeleteNote(item.id)}
              >
                X
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default withAuthenticator(App)
