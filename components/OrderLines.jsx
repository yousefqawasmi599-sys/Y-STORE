export default function OrderLines({ order }) {
  return (
    <table className="order-lines">
      <tbody>
        {order.lines.map((line, index) => <tr key={index}><td>{line.name}<small>{line.color} · {line.size}</small></td><td>× {line.q}</td><td>{line.price * line.q} AED</td></tr>)}
      </tbody>
      <tfoot>
        <tr><td colSpan={2}>Delivery ({order.shipping === "exp" ? "express" : "standard"})</td><td>{order.delivery ? `${order.delivery} AED` : "Free"}</td></tr>
        <tr><th colSpan={2}>Total · cash on delivery</th><th>{order.total} AED</th></tr>
      </tfoot>
    </table>
  );
}
