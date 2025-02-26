import { useEffect, useState } from "react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import axios from 'axios';

const client = generateClient<Schema>();

function App() {
  const { signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });

    // Fetch the markdown content when the component mounts
    fetchMarkdownContent();
  }, []);

  async function fetchMarkdownContent() {
    try {
      const response = await axios.get('/path/to/your/endpoint'); // Replace with your actual endpoint
      setMarkdownContent(response.data.content);
    } catch (error) {
      console.error("Error fetching markdown content:", error);
    }
  }

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }
    
  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }

  return (
    <main>
      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map(todo => <li
          onClick={() => deleteTodo(todo.id)}
          key={todo.id}>
          {todo.content}
        </li>)}
      </ul>
      <div>
        <button onClick={fetchMarkdownContent}>Display Markdown Content</button>
        {markdownContent && <div dangerouslySetInnerHTML={{ __html: markdownContent }} />}
      </div>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
